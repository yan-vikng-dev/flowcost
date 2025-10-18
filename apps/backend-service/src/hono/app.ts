import { Hono } from "hono";
import { verifyWhatsAppSignature, handleIncomingMessage } from "@/handlers/whatsapp";
import { NotificationPayloadSchema } from "@/handlers/whatsapp/types";

export const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => {
  return c.text("Health");
});

app.get("/whatsapp/webhook", (c) => {
  const { "hub.mode": mode, "hub.challenge": challenge, "hub.verify_token": token } = c.req.query();
  if (mode === "subscribe" && token === c.env.WHATSAPP_WEBHOOK_SECRET && challenge) {
    console.log("WEBHOOK VERIFIED");
    return c.text(challenge);
  } else {
    return c.text("Forbidden", 403);
  }
});

const notificationPayloadSchema = NotificationPayloadSchema;

app.post("/whatsapp/webhook", async (c) => {
  const signature = c.req.header("x-hub-signature-256") ?? null;
  const raw = await c.req.raw.arrayBuffer();
  const ok = await verifyWhatsAppSignature(raw, signature, c.env.WHATSAPP_APP_SECRET);
  if (!ok) {
    return c.text("invalid signature", 403);
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return c.text("invalid json", 400);
  }
  const payload = notificationPayloadSchema.parse(json);
  const msg = payload.entry[0]?.changes[0]?.value.messages?.[0];
  const waId = msg?.from;
  const text = msg?.text?.body;
  const messageId = msg?.id;
  if (!waId || !text || !messageId) {
    return c.text("OK");
  }
  console.debug({
    message: "whatsapp webhook raw json",
    json
  })
  c.executionCtx.waitUntil(handleIncomingMessage(c.env, { waId, text, messageId }));
  return c.text("OK");
});
