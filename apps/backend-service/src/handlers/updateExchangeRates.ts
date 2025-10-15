import { getDb } from "@repo/data-ops/database/setup";
import { exchange_rates, InsertExchangeRates } from "@repo/data-ops/drizzle/schemas/exchange_rates";
import { Currency } from "@repo/shared-config";

type ExchangeRateResponse = {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: Currency;
  conversion_rates: Record<Currency, number>;
}

export const updateExchangeRates = async (controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
  const url = `https://v6.exchangerate-api.com/v6/${env.EXCHANGE_RATE_API_KEY}/latest/USD`;
  const result = await fetch(url)
  const data = await result.json() as ExchangeRateResponse;

  const newRates: InsertExchangeRates  = {
    date: new Date().toISOString().split('T')[0],
    rates: data.conversion_rates,
  }

  const db = getDb();
  await db.insert(exchange_rates).values(newRates);
};
