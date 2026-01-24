import { eq, or } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import { user_connections } from "../schemas/index"

export async function getPartnerUserId(
	db: DrizzleDb,
	userId: string,
): Promise<string | null> {
	const conn = await db.query.user_connections.findFirst({
		where: or(
			eq(user_connections.userIdLow, userId),
			eq(user_connections.userIdHigh, userId),
		),
	})
	if (!conn) return null
	return conn.userIdLow === userId ? conn.userIdHigh : conn.userIdLow
}
