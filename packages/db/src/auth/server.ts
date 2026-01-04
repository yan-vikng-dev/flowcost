import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createBetterAuth } from "@/auth/setup"
import type { getDb } from "@/database/setup"
import {
	auth_accounts,
	auth_sessions,
	auth_users,
	auth_verifications,
} from "@/drizzle/schemas"

let betterAuth: ReturnType<typeof createBetterAuth>

export function setAuth(
	config: Omit<Parameters<typeof createBetterAuth>[0], "database"> & {
		adapter: {
			drizzleDb: ReturnType<typeof getDb>
			provider: Parameters<typeof drizzleAdapter>[1]["provider"]
		}
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
	})
	return betterAuth
}

export function getAuth() {
	if (!betterAuth) {
		throw new Error("Auth not initialized")
	}
	return betterAuth
}
