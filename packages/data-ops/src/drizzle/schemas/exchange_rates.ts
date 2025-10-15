import { sqliteTable, text } from "drizzle-orm/sqlite-core"

export type InsertExchangeRates = typeof exchange_rates.$inferInsert;
export type SelectExchangeRates = typeof exchange_rates.$inferSelect;

export const exchange_rates = sqliteTable("exchange_rates", {
	date: text().primaryKey().notNull(), // YYYY-MM-DD
    rates: text({mode: "json"})
        .notNull()
        .$type<Record<string, number>>(),
});