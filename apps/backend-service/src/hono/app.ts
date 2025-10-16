import { Hono } from "hono";
import { verifyWhatsAppSignature, handleIncomingMessage } from "@/handlers/whatsapp";

export const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => {
  return c.text("Health");
});

app.get("/whatsapp/webhook", async (c) => {
  const { 'hub.mode': mode, 'hub.challenge': challenge, 'hub.verify_token': token } = c.req.query();
  if (mode === 'subscribe' && token === c.env.WHATSAPP_WEBHOOK_SECRET) {
    console.log('WEBHOOK VERIFIED');
    return c.text(challenge);
  } else {
    return c.status(403);
  }
})

app.post("/whatsapp/webhook", async (c) => {
  const signature = c.req.header("x-hub-signature-256") ?? null;
  const raw = await c.req.raw.arrayBuffer();
  const ok = await verifyWhatsAppSignature(raw, signature, c.env.WHATSAPP_APP_SECRET);
  if (!ok) {
    return c.text("invalid signature", 403);
  }
  const payload = JSON.parse(new TextDecoder().decode(raw));
  c.executionCtx.waitUntil(handleIncomingMessage(c.env, payload));
  return c.text("OK");
});