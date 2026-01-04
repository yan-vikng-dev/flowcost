import type { DrizzleDb } from "@repo/db/database/setup"
import { getAllowedUserIds } from "@repo/db/drizzle/queries/helpers"
import { entries } from "@repo/db/drizzle/schemas/index"
import { tool } from "ai"
import { and, inArray } from "drizzle-orm"
import { z } from "zod"
import type { MessageContext } from ".."

const deleteEntrySchema = z.object({
	ids: z
		.array(z.string().uuid())
		.min(1)
		.describe("Array of entry IDs to delete. At least one ID is required."),
})

export const makeDeleteEntryTool = (context: MessageContext, db: DrizzleDb) =>
	tool({
		description:
			"Delete one or more financial entries. Only entries that belong to the user (or their partner) can be deleted.",
		inputSchema: deleteEntrySchema,
		execute: async (input) => {
			const allowedUserIds = await getAllowedUserIds(db, context.userId)

			await db
				.delete(entries)
				.where(
					and(
						inArray(entries.userId, allowedUserIds),
						inArray(entries.id, input.ids),
					),
				)

			return {
				deleted: input.ids.length,
				message: `Successfully deleted ${input.ids.length} ${
					input.ids.length === 1 ? "entry" : "entries"
				}`,
			}
		},
	})
