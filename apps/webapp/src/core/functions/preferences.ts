import { getDb } from "@repo/data-ops/database/setup";
import { user_preferences } from "@repo/data-ops/drizzle/schemas/user_preferences/table";
import { currencies, isValidTimeZone } from "@repo/shared-config";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { protectedFunctionMiddleware } from "@/core/middleware/auth";

export const getUserPreferences = createServerFn()
	.middleware([protectedFunctionMiddleware])
	.handler(async (ctx) => {
		const db = getDb();
		let preferences = await db.query.user_preferences.findFirst({
			where: eq(user_preferences.userId, ctx.context.userId),
		});
		if (!preferences) {
			const req = getRequest();
			const cfTz = req.cf?.timezone as string | undefined;
			const envTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const initialTz = cfTz || envTz || "UTC";
			[preferences] = await db
				.insert(user_preferences)
				.values({ userId: ctx.context.userId, timezone: initialTz })
				.returning();
		}
		if (!preferences) throw new Error("Failed to get user preferences");
		return preferences;
	});

export const updateUserPreferencesInput = z.object({
	defaultEntryCurrency: z.enum(currencies),
	displayCurrency: z.enum(currencies),
	timezone: z
		.string()
		.min(1)
		.refine((tz) => isValidTimeZone(tz), { message: "Invalid timezone" }),
});

export type UpdateUserPreferencesInput = z.infer<
	typeof updateUserPreferencesInput
>;

export const updateUserPreferences = createServerFn({ method: "POST" })
	.middleware([protectedFunctionMiddleware])
	.inputValidator(updateUserPreferencesInput)
	.handler(async (ctx) => {
		const db = getDb();
		const payload = ctx.data;
		// Upsert logic
		await db
			.insert(user_preferences)
			.values({
				userId: ctx.context.userId,
				defaultEntryCurrency: payload.defaultEntryCurrency,
				displayCurrency: payload.displayCurrency,
				timezone: payload.timezone,
			})
			.onConflictDoUpdate({
				target: user_preferences.userId,
				set: {
					defaultEntryCurrency: payload.defaultEntryCurrency,
					displayCurrency: payload.displayCurrency,
					timezone: payload.timezone,
				},
			});
		return { ok: true } as const;
	});
