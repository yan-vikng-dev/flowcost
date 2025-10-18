import { getDb } from "@repo/data-ops/database/setup";
import { exchange_rates, InsertExchangeRate } from "@repo/data-ops/drizzle/schemas/exchange_rates";
import { currencies } from "@repo/shared-config";
import { z } from "zod";

const exchangeRateResponseSchema = z.object({
  base_code: z.string(),
  conversion_rates: z.record(z.enum(currencies), z.number()),
});

export const updateExchangeRates = async (
  env: Env,
) => {
  const url = `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/USD`;
  const result = await fetch(url);
  const text = await result.text();
  const json: unknown = JSON.parse(text);
  const data = exchangeRateResponseSchema.parse(json);
  const date = new Date().toISOString().split("T")[0];
  if (!date) throw new Error("Failed to get date");
  const newRates: InsertExchangeRate = {
    date,
    rates: data.conversion_rates,
  };

  const db = getDb();
  await db
    .insert(exchange_rates)
    .values(newRates)
    .onConflictDoUpdate({
      target: exchange_rates.date,
      set: { rates: newRates.rates },
    });
};
