import { getDb } from "@repo/db/database/setup"
import { getEntryForUser } from "@repo/db/drizzle/queries"
import type { ConvertedEntry } from "@repo/db/drizzle/queries/entries"
import {
	getAllowedUserIds,
	getUserTimezoneAndCurrency,
} from "@repo/db/drizzle/queries/helpers"
import { entries, entryTypes } from "@repo/db/drizzle/schemas/index"
import { categories, currencies, toIsoDateInTimezone } from "@repo/shared-lib"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, inArray } from "drizzle-orm"
import { z } from "zod"
import { protectedFunctionMiddleware } from "@/core/middleware/auth"

export const createEntryInput = z.object({
	entryType: z.enum(entryTypes),
	amount: z.number().gt(0),
	currency: z.enum(currencies),
	category: z.enum(categories),
	description: z.string().optional(),
	executedAt: z.date().default(new Date()),
})

export type CreateEntryInput = z.infer<typeof createEntryInput>

export const createEntry = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(createEntryInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { timezone } = await getUserTimezoneAndCurrency(
			db,
			ctx.context.userId,
		)
		const executedDate = toIsoDateInTimezone(ctx.data.executedAt, timezone)
		const [result] = await db
			.insert(entries)
			.values({
				amount: ctx.data.amount,
				currency: ctx.data.currency,
				category: ctx.data.category,
				entryType: ctx.data.entryType,
				description: ctx.data.description,
				executedDate,
				userId: ctx.context.userId,
			})
			.returning({ id: entries.id })

		return { id: result?.id }
	})

export const updateEntryInput = z.object({
	id: z.uuid(),
	amount: z.number().gt(0).optional(),
	currency: z.enum(currencies).optional(),
	category: z.enum(categories).optional(),
	entryType: z.enum(entryTypes).optional(),
	description: z.string().optional(),
	executedDate: z.string().optional(),
})

export type UpdateEntryInput = z.infer<typeof updateEntryInput>

export const updateEntry = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(updateEntryInput)
	.handler(async (ctx) => {
		const db = getDb()
		const { id, ...updates } = ctx.data

		const row = await getEntryForUser(db, id, ctx.context.userId)

		if (!row) {
			throw new Error("Entry not found")
		}

		const patch = {
			...updates,
			isOverridden: Boolean(row.recurringTemplateId),
		}

		await db.update(entries).set(patch).where(eq(entries.id, id))

		return { success: true }
	})

export const deleteEntriesInput = z.object({
	ids: z.array(z.string()).min(1),
})

export type DeleteEntriesInput = z.infer<typeof deleteEntriesInput>

export const deleteEntries = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(deleteEntriesInput)
	.handler(async (ctx) => {
		const db = getDb()
		const ids = ctx.data.ids
		const allowedUserIds = await getAllowedUserIds(db, ctx.context.userId)

		await db
			.delete(entries)
			.where(
				and(inArray(entries.userId, allowedUserIds), inArray(entries.id, ids)),
			)

		return { deleted: ids.length }
	})

export type MonthlyEntry = ConvertedEntry
