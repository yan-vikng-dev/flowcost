import type { SelectUser } from "@repo/db/drizzle/schemas/index"
import {
	sendInteractiveButtons,
	sendWhatsAppText,
} from "@/lib/whatsapp/messages"

export const ONBOARD_CONFIRM_ID = "onboard:confirm"
export const ONBOARD_CHANGE_ID = "onboard:change"

export function parseOnboardButtonId(id: string): "confirm" | "change" | null {
	if (id === ONBOARD_CONFIRM_ID) return "confirm"
	if (id === ONBOARD_CHANGE_ID) return "change"
	return null
}

export async function sendWelcomeMessages(
	env: Env,
	waId: string,
	user: Pick<SelectUser, "timezone" | "displayCurrency">,
) {
	await sendWhatsAppText({
		env,
		waId,
		text: "Hey! I'm Flowcost — I track your spending right here in WhatsApp. Just text me an expense like *coffee 4.50* and I'll log it. You can also send a photo of a receipt or a voice note. By default I send you a spending report every week and at the end of each month — you can pause them anytime.",
	})
	await sendInteractiveButtons({
		env,
		waId,
		bodyText: `From your number I've set you up with timezone *${user.timezone}* and currency *${user.displayCurrency}*. Look right?`,
		buttons: [
			{ id: ONBOARD_CONFIRM_ID, title: "Looks right" },
			{ id: ONBOARD_CHANGE_ID, title: "Change settings" },
		],
	})
}

export async function sendWelcomeBackMessage(env: Env, waId: string) {
	await sendWhatsAppText({
		env,
		waId,
		text: "Welcome back! Just text me an expense anytime — e.g. *lunch 12* — or type /help for a refresher.",
	})
}
