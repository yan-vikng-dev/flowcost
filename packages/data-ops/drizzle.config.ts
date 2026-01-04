import { defineConfig } from "drizzle-kit"

process.loadEnvFile(".env.local")

export default defineConfig({
	schema: "./src/drizzle/schemas/index.ts",
	out: "./src/drizzle/migrations",
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
		databaseId: process.env.CLOUDFLARE_DATABASE_ID!,
		token: process.env.CLOUDFLARE_D1_TOKEN!,
	},
	casing: "snake_case",
	tablesFilter: ["!_cf_KV"],
	strict: true,
})
