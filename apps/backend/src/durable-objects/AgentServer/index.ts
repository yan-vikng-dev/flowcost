import { DurableObject } from "cloudflare:workers"
import {
	createGoogleGenerativeAI,
	type GoogleGenerativeAIProviderOptions,
} from "@ai-sdk/google"
import { withTracing } from "@posthog/ai"
import { getDb, initDatabase } from "@repo/db/database/setup"
import { markUserOnboarded } from "@repo/db/drizzle/queries/helpers"
import type { Currency } from "@repo/shared-lib"
import {
	type ModelMessage,
	pruneMessages,
	stepCountIs,
	ToolLoopAgent,
} from "ai"
import { PostHog } from "posthog-node"
import { sendWhatsAppText, trySendUserFallback } from "@/lib/whatsapp/messages"
import { buildSystemPrompt } from "./systemPrompt"
import { createTools } from "./tools"

const contextWindowMs = 1000 * 60 * 60 // 1 hour
const maxPromptMessages = 40
const trimmedPromptMessages = 30

// History can carry non-JSON values (e.g. Dates in tool results) that the AI SDK rejects on replay.
const toJsonSafe = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export type MessageContext = {
	messageId: string
	waId: string
	userId: string
	defaultEntryCurrency: Currency
	displayCurrency: Currency
	timezone: string
	reportsTime: string
	reportsWeeklyDay: number
	reportsPaused: boolean
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
		const fallbackText =
			"Something went wrong. Please try again, or start a new chat with /new"

		try {
			let result: { text: string; response: { messages: ModelMessage[] } }

			try {
				const baseModel = this.googleProvider("gemini-3.5-flash")
				if (!this.posthogClient)
					throw new Error("Posthog client not initialized")
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
				const createAgent = (stepSink: ModelMessage[]) =>
					new ToolLoopAgent({
						model,
						tools: createTools(messageContext, db, this.env),
						instructions: buildSystemPrompt(messageContext),
						stopWhen: stepCountIs(10),
						maxRetries: 3,
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
							const tail = messages.slice(-trimmedPromptMessages)
							// Never start the prompt mid tool-call/result pair.
							const firstUserIndex = tail.findIndex((m) => m.role === "user")
							return {
								messages:
									firstUserIndex > 0 ? tail.slice(firstUserIndex) : tail,
							}
						},
						onStepFinish: (step) => {
							stepSink.push(...step.response.messages)
						},
					})

				const maxAttempts = 2
				const generateWithRetry = async () => {
					for (let attempt = 1; ; attempt++) {
						const stepSink: ModelMessage[] = []
						const agent = createAgent(stepSink)
						const messages = pruneMessages({
							messages: toJsonSafe(this.turns),
							toolCalls: "before-last-10-messages",
							emptyMessages: "remove",
						})

						try {
							const generateResult = await agent.generate({ messages })
							if (
								generateResult.finishReason === "error" ||
								!generateResult.text
							) {
								throw new Error(
									`Failed to generate text. finishReason: ${generateResult.finishReason}, text: ${generateResult.text}`,
								)
							}
							return generateResult
						} catch (error) {
							const prunedStepSink = pruneMessages({
								messages: stepSink,
								emptyMessages: "remove",
							})
							if (prunedStepSink.length > 0) {
								this.turns.push(...prunedStepSink)
								await this.ctx.storage.put("conversationHistory", this.turns)
							}

							if (attempt >= maxAttempts) throw error
							console.warn("Agent generate attempt failed, retrying", {
								attempt,
								error,
							})
						}
					}
				}

				result = await generateWithRetry()
			} catch (error) {
				console.error({
					event: "agent.handle_message.failed",
					userId: messageContext.userId,
					messageId: messageContext.messageId,
					traceId: this.traceId,
					failurePhase: "generate",
					errorName: error instanceof Error ? error.name : undefined,
					errorMessage: error instanceof Error ? error.message : String(error),
				})
				await trySendUserFallback({
					env: this.env,
					waId: messageContext.waId,
					text: fallbackText,
					error,
					userId: messageContext.userId,
					traceId: this.traceId ?? undefined,
				})
				return
			}

			try {
				const prunedMessages = pruneMessages({
					messages: result.response.messages,
					emptyMessages: "remove",
				})
				this.turns.push(...prunedMessages)
				await this.ctx.storage.put("conversationHistory", this.turns)
			} catch (error) {
				console.error({
					event: "agent.handle_message.failed",
					userId: messageContext.userId,
					messageId: messageContext.messageId,
					traceId: this.traceId,
					failurePhase: "storage",
					errorName: error instanceof Error ? error.name : undefined,
					errorMessage: error instanceof Error ? error.message : String(error),
				})
				await trySendUserFallback({
					env: this.env,
					waId: messageContext.waId,
					text: fallbackText,
					error,
					userId: messageContext.userId,
					traceId: this.traceId ?? undefined,
				})
				return
			}

			try {
				await sendWhatsAppText({
					env: this.env,
					waId: messageContext.waId,
					text: result.text,
					operation: "reply",
					userId: messageContext.userId,
					traceId: this.traceId ?? undefined,
				})

				if (messageContext.isOnboarding) {
					const db = getDb()
					await markUserOnboarded(db, messageContext.userId)
				}
			} catch (error) {
				console.error({
					event: "agent.handle_message.failed",
					userId: messageContext.userId,
					messageId: messageContext.messageId,
					traceId: this.traceId,
					failurePhase: "reply_send",
					errorName: error instanceof Error ? error.name : undefined,
					errorMessage: error instanceof Error ? error.message : String(error),
				})
				return
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
