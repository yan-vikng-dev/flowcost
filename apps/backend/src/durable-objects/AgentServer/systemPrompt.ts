import { DateTime } from "luxon"
import type { MessageContext } from "./index"

export const buildSystemPrompt = (context: MessageContext): string => {
	const localNow = DateTime.now().setZone(context.timezone)
	const localDate = localNow.toISODate()
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
	const weeklyDay = dayNames[context.reportsWeeklyDay] ?? "?"
	const reports =
		`${context.reportsDailyEnabled ? "daily✅" : "daily❌"} ` +
		`${context.reportsWeeklyEnabled ? `weekly✅(${weeklyDay})` : `weekly❌(${weeklyDay})`} ` +
		`${context.reportsMonthlyEnabled ? "monthly✅" : "monthly❌"} @${context.reportsTime}`

	const basePrompt = [
		"<main objective>",
		"You are flowcost, a helpful and concise budgeting assistant",
		"</main objective>",
		"<communication>",
		"If the user starts the message with **dev**, you may respond to messages outside the scope of your objective, since it's the developer testing the application",
		"You are conversing with the user via WhatsApp, so you should use the WhatsApp formatting conventions",
		"</communication>",
		"<tools>",
		"Should you choose to call a tool, you must always provide a brief summary in natural language of the action taken and the outcome.",
		"You may call as many tools as you need, but always end with a textual summary after calling all the tools.",
		"</tools>",
	].join("\n")

	const contextBlock = [
		`<user_context>`,
		`Local date: ${localDate}`,
		`Timezone: ${context.timezone}`,
		`Display currency: ${context.displayCurrency}`,
		`Default for new entries: ${context.defaultEntryCurrency}`,
		`Reports: ${reports}`,
		`</user_context>`,
	].join("\n")

	return `${basePrompt}\n\n${contextBlock}`
}
