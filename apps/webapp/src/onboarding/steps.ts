import type { OnboardingStatus } from "@/core/functions/onboarding"

export type OnboardingStepId =
	| "add-expense"
	| "add-recurring-income"
	| "add-budget"
	| "link-whatsapp"

export type OnboardingStep = {
	id: OnboardingStepId
	checklistLabel: string
	route: "/app" | "/app/settings"
	device?: "desktop" | "mobile"
	target?: string
	mobileTarget?: string
	title: string
	copy: string
	detailSteps?: Array<{
		target: string
		copy: string
	}>
}

export const onboardingSteps: OnboardingStep[] = [
	{
		id: "add-expense",
		checklistLabel: "Add an expense entry",
		route: "/app",
		target: "add-expense",
		title: "Track Your Spending",
		copy: "Bob here—tap the shiny add button so we can start responsibly spending your money.",
		detailSteps: [
			{ target: "entry-type", copy: "Pick Expense" },
			{ target: "entry-amount", copy: "Add the number" },
			{ target: "entry-category", copy: "Tag it" },
			{ target: "entry-date", copy: "Date it" },
			{ target: "entry-create-button", copy: "Create" },
		],
	},
	{
		id: "add-recurring-income",
		checklistLabel: "Add recurring income",
		route: "/app",
		target: "add-income-recurring",
		mobileTarget: "add-expense",
		title: "Set Up Your Income",
		copy: "Open the entry dialog, flip to Recurring + Income, and let the paychecks roll in.",
		detailSteps: [
			{ target: "recurring-toggle", copy: "Make it repeat" },
			{ target: "entry-type", copy: "Mark as Income" },
			{ target: "entry-category", copy: "Pick a bucket" },
			{ target: "entry-amount", copy: "Enter amount" },
			{ target: "entry-create-button", copy: "Save it" },
		],
	},
	{
		id: "add-budget",
		checklistLabel: "Add a budget",
		route: "/app",
		target: "add-budget",
		title: "Fence Your Spending",
		copy: "Bob suggests a financial fence—click and corral those dollars.",
		detailSteps: [
			{ target: "budget-amount", copy: "Set your limit" },
			{ target: "budget-currency", copy: "Choose currency" },
			{ target: "budget-categories", copy: "Select categories" },
			{ target: "budget-create-button", copy: "Create Budget" },
		],
	},
	{
		id: "link-whatsapp",
		checklistLabel: "Link WhatsApp assistant",
		route: "/app/settings",
		target: "link-whatsapp",
		title: "Summon Chat Magic",
		copy: "Tap to summon your personal financial assistant on WhatsApp.",
	},
]

export const completionByStep: Record<
	OnboardingStepId,
	keyof OnboardingStatus
> = {
	"add-expense": "expenseDone",
	"add-recurring-income": "incomeDone",
	"add-budget": "budgetDone",
	"link-whatsapp": "whatsappDone",
}

export function getFirstIncompleteStep(
	status?: OnboardingStatus | null,
): OnboardingStepId {
	const fallback: OnboardingStepId = "add-expense"
	if (!status) return fallback
	const ordered = onboardingSteps.map((step) => step.id)
	const incomplete = ordered.find((stepId) => !status[completionByStep[stepId]])
	return incomplete ?? fallback
}

export function getStepTarget(
	step: OnboardingStep,
	isDesktop: boolean,
): string | undefined {
	if (!isDesktop && step.mobileTarget) return step.mobileTarget
	return step.target
}
