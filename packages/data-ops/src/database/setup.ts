// packages/data-ops/src/database/setup.ts
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "@/drizzle/schemas";
let db: DrizzleD1Database<typeof schema> | undefined;

export function initDatabase(d1Db: D1Database): DrizzleD1Database<typeof schema> {
  if (db) {
    return db;
  }
  console.log("test build")
  db = drizzle(d1Db, { casing: "snake_case", schema });
  return db;
}

export function getDb(): DrizzleD1Database<typeof schema> {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}