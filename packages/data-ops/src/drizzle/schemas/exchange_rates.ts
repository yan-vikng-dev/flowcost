import { sqliteTable, text } from "drizzle-orm/sqlite-core"
import { Currency } from "@repo/shared-config";

export type InsertExchangeRate = typeof exchange_rates.$inferInsert;
export type SelectExchangeRate = typeof exchange_rates.$inferSelect;

export const exchange_rates = sqliteTable("exchange_rates", {
	date: text().primaryKey().notNull(), // YYYY-MM-DD
    rates: text({mode: "json"})
        .notNull()
        .$type<Record<Currency, number>>(),
});