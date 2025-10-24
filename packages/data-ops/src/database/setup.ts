// packages/data-ops/src/database/setup.ts
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1"
import * as schema from "@/drizzle/schemas"

export type DrizzleDb = DrizzleD1Database<typeof schema>
let db: DrizzleDb | undefined

export function initDatabase(d1Db: D1Database) {
	if (db) {
		return db
	}
	try {
		db = drizzle(d1Db, { casing: "snake_case", schema })
	} catch (error) {
		console.error("Error initializing database", error)
		throw error
	}
	return db
}

export function getDb() {
	if (!db) {
		throw new Error("Database not initialized")
	}
	try {
		return db
	} catch (error) {
		console.error("Error getting database", error)
		throw error
	}
}
