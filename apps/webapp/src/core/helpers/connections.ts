import type { DrizzleDb } from "@repo/data-ops/database/setup"
import { user_connections } from "@repo/data-ops/drizzle/schemas/index"
import { eq, or } from "drizzle-orm"

export async function getPartnerUserId(
	db: DrizzleDb,
	userId: string,
): Promise<string | null> {
	const rows = await db
		.select()
		.from(user_connections)
		.where(
			or(
				eq(user_connections.userIdLow, userId),
				eq(user_connections.userIdHigh, userId),
			),
		)
		.limit(1)
	const conn = rows[0]
	if (!conn) return null
	return conn.userIdLow === userId ? conn.userIdHigh : conn.userIdLow
}
