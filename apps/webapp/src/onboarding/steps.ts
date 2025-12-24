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
	triggerCopy: string
	detailSteps?: Array<{
		target: string
		copy: string
	}>
}

export type OnboardingStepWithDetails = OnboardingStep & {
	detailSteps: NonNullable<OnboardingStep["detailSteps"]>
	detailsCopy: string
}

export type OnboardingStepWithoutDetails = OnboardingStep & {
	detailSteps?: undefined
	detailsCopy?: never
}

export type AnyOnboardingStep =
	| OnboardingStepWithDetails
	| OnboardingStepWithoutDetails

export const onboardingSteps: AnyOnboardingStep[] = [
	{
		id: "add-expense",
		checklistLabel: "Add an expense entry",
		route: "/app",
		target: "add-expense",
		title: "Track Your Spending",
		triggerCopy:
			"Let's start by recording an expense. This will be your most used button, and you should use it to record everything.",
		detailsCopy: "Nice. Bought some food today? You can add it now.",
		detailSteps: [
			{ target: "entry-amount", copy: "add the number here" },
			{ target: "entry-currency", copy: "$?" },
			{ target: "entry-description", copy: "mcdonalds, wasn't it?" },
			{ target: "entry-create-button", copy: "Launch!" },
		],
	},
	{
		id: "add-recurring-income",
		checklistLabel: "Add recurring income",
		route: "/app",
		target: "add-expense",
		title: "Set Up Your Income",
		triggerCopy:
			"Next, open the entry dialog and add a recurring income so Flowcost can predict what’s coming in.",
		detailsCopy:
			"Open the entry dialog, flip to Recurring + Income, and let the paychecks roll in.",
		detailSteps: [
			{ target: "recurring-toggle", copy: "Make it repeat" },
			{ target: "entry-type", copy: "Mark as Income" },
			{ target: "entry-category", copy: "use 'salary' category" },
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
		triggerCopy:
			"Now set a budget to keep a category from running wild. Click this and we’ll set one up.",
		detailsCopy: "Nice. Set a limit, pick categories, and save your budget.",
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
		triggerCopy: "Tap to summon your personal financial assistant on WhatsApp.",
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
