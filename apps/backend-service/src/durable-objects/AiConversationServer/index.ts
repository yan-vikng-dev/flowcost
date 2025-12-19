import { DurableObject } from "cloudflare:workers"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { withTracing } from "@posthog/ai"
import { getDb, initDatabase } from "@repo/data-ops/database/setup"
import type { Currency } from "@repo/shared-lib"
import { generateText, type ModelMessage, stepCountIs } from "ai"
import { DateTime } from "luxon"
import { PostHog } from "posthog-node"
import { sendWhatsAppText } from "@/handlers/whatsapp/helpers"
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
	reportsDailyEnabled: boolean
	reportsWeeklyEnabled: boolean
	reportsMonthlyEnabled: boolean
	reportsTime: string
	reportsWeeklyDay: number
}

export class AiConversationServer extends DurableObject {
	turns: ModelMessage[] = []
	posthogClient: PostHog | null = null
	seenMessageIds: Set<string> = new Set()
	inProgressMessageIds: Set<string> = new Set()
	processing: Promise<void> = Promise.resolve()
	traceId: string | null = null

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		void ctx.blockConcurrencyWhile(async () => {
			initDatabase(env.DB)
			const storedHistory =
				(await ctx.storage.get<ModelMessage[]>("conversationHistory")) ?? []
			this.turns = sanitizeTurns(storedHistory)

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
		console.debug("handleMessage called", {
			userMessage: message,
			messageContext,
		})
		const { messageId } = messageContext
		if (
			this.seenMessageIds.has(messageId) ||
			this.inProgressMessageIds.has(messageId)
		)
			return
		this.inProgressMessageIds.add(messageId)
		await this.ctx.storage.setAlarm(Date.now() + contextWindowMs)

		const run = async () => {
			try {
				await this.processingMessage(message, messageContext)
			} finally {
				this.inProgressMessageIds.delete(messageId)
			}
		}
		this.processing = this.processing.then(run, run)
		this.ctx.waitUntil(this.processing)
	}

	private async processingMessage(
		message: string,
		messageContext: MessageContext,
	) {
		try {
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

			this.turns.push({ role: "user", content: message })
			const db = getDb()
			const tools = {
				create_entry: makeCreateEntryTool(messageContext, db),
				get_entries: makeGetEntriesTool(messageContext, db),
				update_preferences: makeUpdatePreferencesTool(messageContext, db),
				update_entry: makeUpdateEntryTool(messageContext, db),
				delete_entry: makeDeleteEntryTool(messageContext, db),
			}

			const messages = buildPrompt(this.turns, messageContext)
			const result = await generateText({
				model,
				tools,
				messages,
				maxRetries: 3,
				stopWhen: [
					({ steps }) => steps.some((step) => step.finishReason === "stop"),
					stepCountIs(10),
				],
			})

			this.turns.push(...result.response.messages)
			await this.ctx.storage.put("conversationHistory", this.turns)

			console.debug({
				message: "generated text",
				text: result.text,
				finishReason: result.finishReason,
				stepCount: result.steps.length,
				toolCallsCount: result.toolCalls.length,
			})

			if (result.finishReason === "error" || !result.text) {
				throw new Error("Failed to generate text")
			}

			await sendWhatsAppText({
				env: this.env,
				waId: messageContext.waId,
				text: result.text,
			})
		} catch (error) {
			console.error("Error in AiConversationServer.handleMessage", {
				userId: messageContext.userId,
				messageId: messageContext.messageId,
				traceId: this.traceId,
				error: error instanceof Error ? error.message : String(error),
				stack: error instanceof Error ? error.stack : undefined,
				errorName: error instanceof Error ? error.name : undefined,
			})
			try {
				await sendWhatsAppText({
					env: this.env,
					waId: messageContext.waId,
					text: "Something went wrong. Please try again, or start a new chat with /new",
				})
			} catch (sendError) {
				console.error("Failed to send WhatsApp error message", {
					userId: messageContext.userId,
					messageId: messageContext.messageId,
					sendError:
						sendError instanceof Error ? sendError.message : String(sendError),
				})
			}
		} finally {
			this.seenMessageIds.add(messageContext.messageId)
			if (this.seenMessageIds.size > 100) {
				const toKeep = Array.from(this.seenMessageIds).slice(-50)
				this.seenMessageIds = new Set(toKeep)
			}
			try {
				await this.ctx.storage.put(
					"seenMessageIds",
					Array.from(this.seenMessageIds),
				)
			} catch (storageError) {
				console.error("Failed to persist seenMessageIds", {
					userId: messageContext.userId,
					messageId: messageContext.messageId,
					storageError:
						storageError instanceof Error
							? storageError.message
							: String(storageError),
				})
			}
		}
	}

	async alarm() {
		await this.reset()
	}

	async reset() {
		this.turns = []
		this.traceId = crypto.randomUUID()
		await this.ctx.storage.put("conversationHistory", this.turns)
		await this.ctx.storage.put("traceId", this.traceId)
	}

	async appendReport(messageId: string, report: string): Promise<void> {
		if (this.seenMessageIds.has(messageId)) {
			return
		}
		this.seenMessageIds.add(messageId)
		this.turns.push({
			role: "assistant",
			content: report,
		})
		await this.ctx.storage.put("conversationHistory", this.turns)
		await this.ctx.storage.put(
			"seenMessageIds",
			Array.from(this.seenMessageIds),
		)
	}
}

function buildPrompt(
	turns: ModelMessage[],
	context: MessageContext,
): ModelMessage[] {
	return [getSystemMessage(), makeContextMessage(context), ...turns]
}

function sanitizeTurns(messages: ModelMessage[]): ModelMessage[] {
	return messages.filter((m) => {
		if (m.role === "system") return false
		if (
			m.role === "assistant" &&
			typeof m.content === "string" &&
			m.content.startsWith("[Context]")
		)
			return false
		return true
	})
}

function makeContextMessage(context: MessageContext): ModelMessage {
	const localNow = DateTime.now().setZone(context.userTimezone)
	const localDate = localNow.toISODate()
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
	const weeklyDay = dayNames[context.reportsWeeklyDay] ?? "?"
	const reports =
		`${context.reportsDailyEnabled ? "daily✅" : "daily❌"} ` +
		`${context.reportsWeeklyEnabled ? `weekly✅(${weeklyDay})` : `weekly❌(${weeklyDay})`} ` +
		`${context.reportsMonthlyEnabled ? "monthly✅" : "monthly❌"} @${context.reportsTime}`

	return {
		role: "assistant",
		content:
			`[Context]\n` +
			`- Local date: ${localDate}\n` +
			`- Timezone: ${context.userTimezone}\n` +
			`- Currencies: display ${context.displayCurrency}, default ${context.defaultEntryCurrency}\n` +
			`- Reports: ${reports}`,
	}
}
