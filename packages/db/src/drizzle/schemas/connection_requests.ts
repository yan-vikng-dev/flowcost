import { relations } from "drizzle-orm"
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { timestamps } from "./helpers"
import { users } from "./users"

export const connectionRequestStatuses = ["pending"] as const
export type ConnectionRequestStatus = (typeof connectionRequestStatuses)[number]

/**
 * A pending 1:1 pairing request created via WhatsApp `/pair <phone>`.
 * Rows are deleted once accepted/declined/expired, so `status` is informational.
 */
export const connection_requests = sqliteTable(
	"connection_requests",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		requesterUserId: text()
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		targetWaId: text().notNull(),
		status: text({ enum: connectionRequestStatuses })
			.notNull()
			.default("pending"),
		expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
		...timestamps,
	},
	(table) => [index("connection_requests_target_wa_idx").on(table.targetWaId)],
)

export const connectionRequestsRelations = relations(
	connection_requests,
	({ one }) => ({
		requester: one(users, {
			fields: [connection_requests.requesterUserId],
			references: [users.id],
		}),
	}),
)

export type InsertConnectionRequest = typeof connection_requests.$inferInsert
export type SelectConnectionRequest = typeof connection_requests.$inferSelect
