import { DurableObject } from "cloudflare:workers";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai"
import { systemPrompt } from "./config";

export type MessageContext = {
  messageId: string;
  waId: string;
  userId: string;
};

export class AiConversationServer extends DurableObject {
  conversationHistory: ModelMessage[] = [];
  posthogClient: PostHog | null = null;
  seenMessageIds: Set<string> = new Set();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      const [conversationHistory, seenMessageIds, posthogClient] = await Promise.all([
        ctx.storage.get<ModelMessage[]>("conversationHistory"),
        ctx.storage.get<string[]>("seenMessageIds"),
        new PostHog(env.POSTHOG_API_KEY, {host: env.POSTHOG_HOST, flushAt: 1, flushInterval: 0})
      ]);
      this.conversationHistory = conversationHistory || [{role: "system", content: systemPrompt}];
      this.seenMessageIds = new Set(seenMessageIds || []);
      this.posthogClient = posthogClient;
    });
  }

  async handleMessage(message: string, messageContext: MessageContext) {
    if (this.seenMessageIds.has(messageContext.messageId)) return null;
    else this.seenMessageIds.add(messageContext.messageId);
    if (this.seenMessageIds.size > 100) {
      const toKeep = Array.from(this.seenMessageIds).slice(-50);
      this.seenMessageIds = new Set(toKeep);
    }

    const googleProvider = createGoogleGenerativeAI({apiKey: this.env.GEMINI_API_KEY});
    const baseModel = googleProvider("gemini-2.5-flash-lite");
    if (!this.posthogClient) throw new Error("Posthog client not initialized");
    const model = withTracing(baseModel, this.posthogClient, {
      posthogDistinctId: messageContext.userId,
      posthogTraceId: this.ctx.id.toString(),
      posthogPrivacyMode: false,
      // posthogGroups:{
      //   platform: "whatsapp",
      //   channelId: "..."
      // }
    });
    const result = await generateText({
      model,
      messages: [...this.conversationHistory, {role: "user", content: message}],
      stopWhen: [({steps}) => steps.some((step) => step.finishReason === "stop"), stepCountIs(10)]
    })
    this.conversationHistory.push(...result.response.messages);

    await Promise.all([
      this.ctx.storage.put("conversationHistory", this.conversationHistory),
      this.ctx.storage.put("seenMessageIds", Array.from(this.seenMessageIds)),
    ]);
    const finalMessage = result.text || "Something went wrong. Please try again.";
    console.debug({
      message: "generated text",
      text: result.text,
      finalMessage,
      finishReason: result.finishReason,
      stepCount: result.steps.length,
    });
    return finalMessage;
  }
}
