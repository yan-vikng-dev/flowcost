import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { sql } from "drizzle-orm"
import { auth_users } from "./auth";
import { categories } from "@repo/shared-config";

export const entries = sqliteTable("entries", {
	id: text().primaryKey().notNull(),
	amount: integer().notNull(),
	currency: text().notNull(),
	category: text({ enum: categories }).notNull(),
	description: text(),
	userId: text("user_id").notNull().references(() => auth_users.id, { onDelete: "cascade" } ),
	createdAt: integer("created_at", { mode: "timestamp_ms" }).default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`).notNull(),
	updatedAt: integer("updated_at", { mode: "timestamp_ms" })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull(),
});
