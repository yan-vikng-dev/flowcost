import { and, desc, eq, gt, or } from "drizzle-orm"
import type { DrizzleDb } from "../../database/setup"
import {
	connection_requests,
	type SelectConnectionRequest,
	type SelectUserConnection,
	user_connections,
} from "../schemas/index"

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

export async function hasConnection(
	db: DrizzleDb,
	userId: string,
): Promise<boolean> {
	const conn = await db.query.user_connections.findFirst({
		where: or(
			eq(user_connections.userIdLow, userId),
			eq(user_connections.userIdHigh, userId),
		),
	})
	return conn !== undefined
}

export async function createConnectionRequest(
	db: DrizzleDb,
	{
		requesterUserId,
		targetWaId,
		expiresAt,
	}: {
		requesterUserId: string
		targetWaId: string
		expiresAt: Date
	},
): Promise<SelectConnectionRequest> {
	const [request] = await db
		.insert(connection_requests)
		.values({
			requesterUserId,
			targetWaId,
			expiresAt,
			status: "pending",
		})
		.returning()

	if (!request) {
		throw new Error("Failed to create connection request")
	}

	return request
}

export async function findPendingRequestForWa(
	db: DrizzleDb,
	targetWaId: string,
): Promise<SelectConnectionRequest | undefined> {
	return db.query.connection_requests.findFirst({
		where: and(
			eq(connection_requests.targetWaId, targetWaId),
			eq(connection_requests.status, "pending"),
			gt(connection_requests.expiresAt, new Date()),
		),
		orderBy: desc(connection_requests.createdAt),
	})
}

export async function acceptConnectionRequest(
	db: DrizzleDb,
	{
		requestId,
		accepterUserId,
	}: {
		requestId: string
		accepterUserId: string
	},
): Promise<SelectUserConnection | null> {
	const request = await db.query.connection_requests.findFirst({
		where: eq(connection_requests.id, requestId),
	})
	if (!request) return null

	const userIdLow =
		request.requesterUserId < accepterUserId
			? request.requesterUserId
			: accepterUserId
	const userIdHigh =
		request.requesterUserId < accepterUserId
			? accepterUserId
			: request.requesterUserId

	const [connection] = await db
		.insert(user_connections)
		.values({ userIdLow, userIdHigh })
		.returning()

	await db
		.delete(connection_requests)
		.where(eq(connection_requests.id, requestId))

	return connection ?? null
}

export async function deleteConnectionRequest(
	db: DrizzleDb,
	requestId: string,
): Promise<void> {
	await db
		.delete(connection_requests)
		.where(eq(connection_requests.id, requestId))
}

export async function getPendingConnectionRequestById(
	db: DrizzleDb,
	requestId: string,
): Promise<SelectConnectionRequest | undefined> {
	return db.query.connection_requests.findFirst({
		where: and(
			eq(connection_requests.id, requestId),
			eq(connection_requests.status, "pending"),
			gt(connection_requests.expiresAt, new Date()),
		),
	})
}
