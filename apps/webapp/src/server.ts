// src/server.ts - TanStack Start Server Entry for cloudflare worker

import { env } from "cloudflare:workers"
import { setAuth } from "@repo/data-ops/auth/server"
import { initDatabase } from "@repo/data-ops/database/setup"
import handler from "@tanstack/react-start/server-entry"

export default {
	async fetch(request: Request) {
		const db = initDatabase(env.DB)
		setAuth({
			secret: env.BETTER_AUTH_SECRET,
			socialProviders: {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET,
				},
			},
			adapter: {
				drizzleDb: db,
				provider: "sqlite",
			},
		})
		return handler.fetch(request, {
			context: {
				fromFetch: true,
			},
		})
	},
}
