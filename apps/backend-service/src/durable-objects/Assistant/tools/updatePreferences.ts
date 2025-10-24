import type { DrizzleDb } from "@repo/data-ops/database/setup";
import { user_preferences } from "@repo/data-ops/drizzle/schemas/index";
import { type Currency, currencies } from "@repo/shared-config";
import { tool } from "ai";
import { z } from "zod";
import type { MessageContext } from "../AiConversationServer";

const updatePreferencesSchema = z.object({
	timezone: z
		.string()
		.optional()
		.describe(
			"New timezone for the user in IANA format, for example Europe/Paris",
		),
	displayCurrency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe(
			"The currency to which all entries are converted (including when fetching with get_entries)",
		),
	defaultEntryCurrency: z
		.string()
		.regex(/^[A-Z]{3}$/)
		.optional()
		.describe("The default currency for new entries"),
});

export const makeUpdatePreferencesTool = (
	context: MessageContext,
	db: DrizzleDb,
) =>
	tool({
		name: "update_preferences",
		description:
			"update the user's preferences. any omitted properties will be left unchanged.",
		inputSchema: updatePreferencesSchema,
		execute: async (input) => {
			const displayCurrency =
				(input.displayCurrency as Currency | undefined) ??
				context.displayCurrency;
			const defaultEntryCurrency =
				(input.defaultEntryCurrency as Currency | undefined) ??
				context.defaultEntryCurrency;
			const timezone = input.timezone ?? context.userTimezone;
			if (!currencies.includes(displayCurrency))
				throw new Error(`invalid currency provided ${displayCurrency}`);
			if (!currencies.includes(defaultEntryCurrency))
				throw new Error(`invalid currency provided ${defaultEntryCurrency}`);
			await db
				.insert(user_preferences)
				.values({
					userId: context.userId,
					displayCurrency,
					defaultEntryCurrency,
					timezone,
				})
				.onConflictDoUpdate({
					target: user_preferences.userId,
					set: {
						displayCurrency,
						defaultEntryCurrency,
						timezone,
					},
				});
		},
	});
