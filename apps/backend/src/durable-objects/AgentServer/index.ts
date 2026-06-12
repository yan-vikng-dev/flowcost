import { DurableObject } from "cloudflare:workers"
import {
	createGoogleGenerativeAI,
	type GoogleGenerativeAIProviderOptions,
} from "@ai-sdk/google"
import { withTracing } from "@posthog/ai"
import { getDb, initDatabase } from "@repo/db/database/setup"
import type { Currency } from "@repo/shared-lib"
import {
	type ModelMessage,
	pruneMessages,
	stepCountIs,
	ToolLoopAgent,
} from "ai"
import { PostHog } from "posthog-node"
import { sendWhatsAppText } from "@/lib/whatsapp/messages"
import { buildSystemPrompt } from "./systemPrompt"
import { createTools } from "./tools"

const contextWindowMs = 1000 * 60 * 60 // 1 hour
const maxPromptMessages = 40
const trimmedPromptMessages = 30

export type MessageContext = {
	messageId: string
	waId: string
	userId: string
	defaultEntryCurrency: Currency
	displayCurrency: Currency
	timezone: string
	reportsTime: string
	reportsWeeklyDay: number
	isOnboarding: boolean
}

export class AgentServer extends DurableObject {
	turns: ModelMessage[] = []
	posthogClient: PostHog | null = null
	seenMessageIds: Set<string> = new Set()
	inProgressMessageIds: Set<string> = new Set()
	processing: Promise<void> = Promise.resolve()
	traceId: string | null = null
	googleProvider: ReturnType<typeof createGoogleGenerativeAI>

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env)
		this.googleProvider = createGoogleGenerativeAI({
			apiKey: env.GEMINI_API_KEY,
		})
		void ctx.blockConcurrencyWhile(async () => {
			initDatabase(env.DB)
			this.turns =
				(await ctx.storage.get<ModelMessage[]>("conversationHistory")) ?? []
			this.traceId =
				(await ctx.storage.get<string>("traceId")) ?? crypto.randomUUID()
			this.seenMessageIds = new Set(
				await ctx.storage.get<string[]>("seenMessageIds"),
			)
			this.posthogClient = new PostHog(env.POSTHOG_KEY, {
				host: env.POSTHOG_HOST,
				flushAt: 1,
				flushInterval: 0,
			})
		})
	}

	async handleMessage(message: UserContent, messageContext: MessageContext) {
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
		message: UserContent,
		messageContext: MessageContext,
	) {
		try {
			const baseModel = this.googleProvider("gemini-3.5-flash")
			if (!this.posthogClient) throw new Error("Posthog client not initialized")
			if (!this.traceId) throw new Error("Trace ID not initialized")
			this.posthogClient.identify({ distinctId: messageContext.userId })
			const model = withTracing(baseModel, this.posthogClient, {
				posthogDistinctId: messageContext.userId,
				posthogTraceId: this.traceId,
				posthogPrivacyMode: false,
				posthogProperties: {
					$session_id: this.traceId,
					$ai_session_id: this.traceId,
				},
			})

			this.turns.push({ role: "user", content: message })
			const db = getDb()
			const agent = new ToolLoopAgent({
				model,
				tools: createTools(messageContext, db, this.env),
				instructions: buildSystemPrompt(messageContext),
				stopWhen: stepCountIs(10),
				providerOptions: {
					google: {
						thinkingConfig: {
							thinkingLevel: "medium",
							includeThoughts: false,
						},
					} satisfies GoogleGenerativeAIProviderOptions,
				},
				prepareStep: ({ messages }) => {
					if (messages.length <= maxPromptMessages)
						return { messages: messages }
					return {
						messages: messages.slice(-trimmedPromptMessages),
					}
				},
			})
			const messages = this.turns
			const result = await agent.generate({ messages })

			const prunedMessages = pruneMessages({
				messages: result.response.messages,
				toolCalls: "all",
				emptyMessages: "remove",
			})
			this.turns.push(...prunedMessages)
			await this.ctx.storage.put("conversationHistory", this.turns)

			if (result.finishReason === "error" || !result.text) {
				throw new Error(
					`Failed to generate text. finishReason: ${result.finishReason}, text: ${result.text}`,
				)
			}

			await sendWhatsAppText({
				env: this.env,
				waId: messageContext.waId,
				text: result.text,
			})
		} catch (error) {
			console.error("Error in AgentServer.handleMessage", {
				userId: messageContext.userId,
				messageId: messageContext.messageId,
				traceId: this.traceId,
				error,
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
					sendError,
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
					storageError,
				})
			}
		}
	}

	override async alarm() {
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

type UserContent = Extract<ModelMessage, { role: "user" }>["content"]
