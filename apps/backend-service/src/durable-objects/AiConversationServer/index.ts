import { DurableObject } from "cloudflare:workers"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { withTracing } from "@posthog/ai"
import { getDb, initDatabase } from "@repo/data-ops/database/setup"
import type { Currency } from "@repo/shared-lib"
import { generateText, type ModelMessage, stepCountIs } from "ai"
import { PostHog } from "posthog-node"
import { getSystemMessage } from "./config"
import {
	makeCreateEntryTool,
	makeDeleteEntryTool,
	makeGetEntriesTool,
	makeUpdateEntryTool,
	makeUpdatePreferencesTool,
} from "./tools"

const contextWindowMs = 1000 * 60 * 60 // 1 hour

export type MessageContext = {
	messageId: string
	waId: string
	userId: string
	defaultEntryCurrency: Currency
	displayCurrency: Currency
	userTimezone: string
}

export class AiConversationServer extends DurableObject {
	conversationHistory: ModelMessage[] = []
	posthogClient: PostHog | null = null
	seenMessageIds: Set<string> = new Set()
	traceId: string | null = null

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		void ctx.blockConcurrencyWhile(async () => {
			initDatabase(env.DB)
			const storedHistory = await ctx.storage.get<ModelMessage[]>(
				"conversationHistory",
			)
			this.conversationHistory = storedHistory ?? [getSystemMessage()]

			this.traceId =
				(await ctx.storage.get<string>("traceId")) || crypto.randomUUID()
			this.seenMessageIds = new Set(
				await ctx.storage.get<string[]>("seenMessageIds"),
			)
			this.posthogClient = new PostHog(env.POSTHOG_API_KEY, {
				host: env.POSTHOG_HOST,
				flushAt: 1,
				flushInterval: 0,
			})
		})
	}

	async handleMessage(message: string, messageContext: MessageContext) {
		try {
			if (this.seenMessageIds.has(messageContext.messageId)) return null
			else this.seenMessageIds.add(messageContext.messageId)
			if (this.seenMessageIds.size > 100) {
				const toKeep = Array.from(this.seenMessageIds).slice(-50)
				this.seenMessageIds = new Set(toKeep)
			}
			await this.ctx.storage.setAlarm(Date.now() + contextWindowMs)
			const googleProvider = createGoogleGenerativeAI({
				apiKey: this.env.GEMINI_API_KEY,
			})
			const baseModel = googleProvider("gemini-2.5-flash")
			if (!this.posthogClient) throw new Error("Posthog client not initialized")
			if (!this.traceId) throw new Error("Trace ID not initialized")
			const model = withTracing(baseModel, this.posthogClient, {
				posthogDistinctId: messageContext.userId,
				posthogTraceId: this.traceId,
				posthogPrivacyMode: false,
			})
			this.conversationHistory.push({ role: "user", content: message })
			const db = getDb()
			const tools = {
				create_entry: makeCreateEntryTool(messageContext, db),
				get_entries: makeGetEntriesTool(messageContext, db),
				update_preferences: makeUpdatePreferencesTool(messageContext, db),
				update_entry: makeUpdateEntryTool(messageContext, db),
				delete_entry: makeDeleteEntryTool(messageContext, db),
			}
			const result = await generateText({
				model,
				tools,
				messages: this.conversationHistory,
				stopWhen: [
					({ steps }) => steps.some((step) => step.finishReason === "stop"),
					stepCountIs(10),
				],
			})
			this.conversationHistory.push(...result.response.messages)
			await this.ctx.storage.put(
				"seenMessageIds",
				Array.from(this.seenMessageIds),
			)
			console.debug({
				message: "generated text",
				text: result.text,
				finishReason: result.finishReason,
				stepCount: result.steps.length,
			})
			if (!result.text || result.finishReason === "error") {
				console.error("AI text generation failed", {
					userId: messageContext.userId,
					waId: messageContext.waId,
					messageId: messageContext.messageId,
					finishReason: result.finishReason,
					hasText: !!result.text,
					stepCount: result.steps.length,
					traceId: this.traceId,
				})
				throw new Error("Failed to generate text")
			}
			return result.text
		} catch (error) {
			console.error("Error in AiConversationServer.handleMessage", {
				userId: messageContext.userId,
				waId: messageContext.waId,
				messageId: messageContext.messageId,
				message,
				traceId: this.traceId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				errorName: error instanceof Error ? error.name : undefined,
			})
			throw error
		}
	}

	async alarm() {
		await this.reset()
	}

	async reset() {
		this.conversationHistory = [getSystemMessage()]
		this.traceId = crypto.randomUUID()
		await this.ctx.storage.put("conversationHistory", this.conversationHistory)
		await this.ctx.storage.put("traceId", this.traceId)
	}

	async appendReport(messageId: string, report: string): Promise<void> {
		if (this.seenMessageIds.has(messageId)) {
			return
		}
		this.seenMessageIds.add(messageId)
		this.conversationHistory.push({
			role: "assistant",
			content: report,
		})
		await this.ctx.storage.put("conversationHistory", this.conversationHistory)
		await this.ctx.storage.put(
			"seenMessageIds",
			Array.from(this.seenMessageIds),
		)
	}
}
