import type { Currency } from "@repo/shared-config"
import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export type InsertExchangeRate = typeof exchange_rates.$inferInsert
export type SelectExchangeRate = typeof exchange_rates.$inferSelect

export const exchange_rates = sqliteTable("exchange_rates", {
	date: text().primaryKey().notNull(), // YYYY-MM-DD
	rates: text({ mode: "json" }).notNull().$type<Record<Currency, number>>(),
	createdAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.notNull(),
	updatedAt: integer({ mode: "timestamp_ms" })
		.default(sql`(unixepoch() * 1000)`)
		.$onUpdate(() => new Date())
		.notNull(),
})
