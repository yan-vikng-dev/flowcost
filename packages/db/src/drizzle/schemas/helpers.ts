import { integer } from "drizzle-orm/sqlite-core"

export const timestamps = {
	createdAt: integer({ mode: "timestamp_ms" })
		.$default(() => new Date())
		.notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.$onUpdate(() => new Date())
		.notNull(),
}

export const entryTypes = ["Expense", "Income"] as const
export type EntryType = (typeof entryTypes)[number]
