import { env } from "cloudflare:workers"
import { getDb } from "@repo/data-ops/database/setup"
import {
	whatsapp_link_tokens,
	whatsapp_links,
} from "@repo/data-ops/drizzle/schemas/index"
import { sha256Hex, token44 } from "@repo/shared-config/crypto"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const startWhatsappLink = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(z.void())
	.handler(async (ctx) => {
		const db = getDb()

		const token = token44()
		const tokenHash = await sha256Hex(token)

		const now = Date.now()
		const expiresAt = new Date(now + 5 * 60 * 1000)

		await db.insert(whatsapp_link_tokens).values({
			id: crypto.randomUUID(),
			userId: ctx.context.userId,
			tokenHash,
			expiresAt,
		})

		const phoneE164 = String(env.WHATSAPP_E164)
		const messageText = `/verify ${token}`
		const waMeUrl = `https://wa.me/${phoneE164}?text=${encodeURIComponent(messageText)}`

		return { url: waMeUrl } as const
	})

export const getWhatsappLinkStatus = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb()
		const rows = await db
			.select()
			.from(whatsapp_links)
			.where(eq(whatsapp_links.userId, ctx.context.userId))
			.limit(1)
		const link = rows[0]
		if (!link) return { linked: false as const }
		return { linked: true as const, waId: link.waId }
	})

export const unlinkWhatsapp = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(z.void())
	.handler(async (ctx) => {
		const db = getDb()
		await db
			.delete(whatsapp_links)
			.where(eq(whatsapp_links.userId, ctx.context.userId))
		return { ok: true } as const
	})
