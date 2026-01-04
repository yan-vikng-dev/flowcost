import type { Config } from "drizzle-kit"

process.loadEnvFile(".env.local")

const config: Config = {
	// Use a single entry to avoid duplicate evaluation across multiple files
	schema: "./src/drizzle/schemas/index.ts",
	out: "./src/drizzle/migrations",
	dialect: "sqlite",
	driver: "d1-http",
	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
		databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? "",
		token: process.env.CLOUDFLARE_D1_TOKEN ?? "",
	},
	casing: "snake_case",
	tablesFilter: ["!_cf_KV"],
}
export default config satisfies Config
