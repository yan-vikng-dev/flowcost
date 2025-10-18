import { createServerFn } from "@tanstack/react-start";
import { protectedFunctionMiddleware } from "@/core/middleware/auth";
import { getDb } from "@repo/data-ops/database/setup";
import { whatsapp_link_tokens } from "@repo/data-ops/drizzle/schemas/whatsapp_link_tokens";
import { whatsapp_links } from "@repo/data-ops/drizzle/schemas/whatsapp_links";
import { eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { z } from "zod";

function randomHex(bytes: number = 32): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(d))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

export const startWhatsappLink = createServerFn({ method: "POST" })
  .middleware([protectedFunctionMiddleware])
  .inputValidator(z.void())
  .handler(async (ctx) => {
    const db = getDb();

    const token = randomHex(32);
    const tokenHash = await sha256Hex(token);

    const now = Date.now();
    const expiresAt = new Date(now + 5 * 60 * 1000);

    await db.insert(whatsapp_link_tokens).values({
      id: crypto.randomUUID(),
      userId: ctx.context.userId,
      tokenHash,
      expiresAt,
    });

    const phoneE164 = String(env.WHATSAPP_E164);
    const messageText = `/token${token}`;
    const waMeUrl = `https://wa.me/${phoneE164}?text=${encodeURIComponent(messageText)}`;

    return { url: waMeUrl } as const;
  });

export const getWhatsappLinkStatus = createServerFn()
  .middleware([protectedFunctionMiddleware])
  .handler(async (ctx) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(whatsapp_links)
      .where(eq(whatsapp_links.userId, ctx.context.userId))
      .limit(1);
    const link = rows[0];
    if (!link) return { linked: false as const };
    return { linked: true as const, waId: link.waId };
  });
