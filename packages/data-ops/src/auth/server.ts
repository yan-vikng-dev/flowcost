import { createBetterAuth } from "@/auth/setup";
import { getDb } from "@/database/setup";
import { auth_users } from "@/drizzle/schemas/auth_users/table";
import { auth_accounts } from "@/drizzle/schemas/auth_accounts/table";
import { auth_sessions } from "@/drizzle/schemas/auth_sessions/table";
import { auth_verifications } from "@/drizzle/schemas/auth_verifications/table";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

let betterAuth: ReturnType<typeof createBetterAuth>;

export function setAuth(
  config: Omit<Parameters<typeof createBetterAuth>[0], "database"> & {
    adapter: {
      drizzleDb: ReturnType<typeof getDb>;
      provider: Parameters<typeof drizzleAdapter>[1]["provider"];
    };
  },
) {
  betterAuth = createBetterAuth({
    database: drizzleAdapter(config.adapter.drizzleDb, {
      provider: config.adapter.provider,
      schema: {
        auth_users,
        auth_accounts,
        auth_sessions,
        auth_verifications,
      },
    }),
    ...config,
  });
  return betterAuth;
}

export function getAuth() {
  if (!betterAuth) {
    throw new Error("Auth not initialized");
  }
  return betterAuth;
}
