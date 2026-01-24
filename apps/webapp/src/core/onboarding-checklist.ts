export const ONBOARDING_CHECKLIST_STORAGE_KEY =
	"flowcost:onboardingChecklistDismissedAt"

export const onboardingChecklistItems = [
	{
		id: "add-expense",
		title: "Add an expense",
		description:
			"Use the Add entry button on the dashboard and save an Expense entry.",
	},
	{
		id: "add-recurring-income",
		title: "Add a recurring income",
		description:
			"Open the Recurring card and create a new Income template to repeat.",
	},
	{
		id: "add-budget",
		title: "Add a budget",
		description:
			"Create your first budget from the Budgets card to track a category.",
	},
	{
		id: "connect-whatsapp",
		title: "Connect WhatsApp assistant",
		description:
			"Visit Settings and link WhatsApp under the Assistant section.",
	},
] as const

export type OnboardingChecklistItemId =
	(typeof onboardingChecklistItems)[number]["id"]

export function readOnboardingChecklistDismissed() {
	if (typeof window === "undefined") return null
	return window.localStorage.getItem(ONBOARDING_CHECKLIST_STORAGE_KEY) !== null
}

export function setOnboardingChecklistDismissed(dismissed: boolean) {
	if (typeof window === "undefined") return
	if (dismissed) {
		window.localStorage.setItem(
			ONBOARDING_CHECKLIST_STORAGE_KEY,
			String(Date.now()),
		)
		return
	}
	window.localStorage.removeItem(ONBOARDING_CHECKLIST_STORAGE_KEY)
}
