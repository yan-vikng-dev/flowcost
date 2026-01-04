import type { DrizzleDb } from "../../database/setup"

export async function getPartnerUserId(
	db: DrizzleDb,
	userId: string,
): Promise<string | null> {
	const conn = await db.query.user_connections.findFirst({
		where: {
			OR: [{ userIdLow: userId }, { userIdHigh: userId }],
		},
	})
	if (!conn) return null
	return conn.userIdLow === userId ? conn.userIdHigh : conn.userIdLow
}
