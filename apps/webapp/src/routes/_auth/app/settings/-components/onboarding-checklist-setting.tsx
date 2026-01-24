import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { listRecurringTemplates } from "@/core/functions/recurring-templates"
import { getWhatsappLinkStatus } from "@/core/functions/whatsapp"
import {
	type OnboardingChecklistItemId,
	onboardingChecklistItems,
	readOnboardingChecklistDismissed,
	setOnboardingChecklistDismissed,
} from "@/core/onboarding-checklist"
import { getBudgets } from "../../-functions/monthlyBudgets"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "../../-functions/monthlyEntries"

const CHECKLIST_QUERY_STALE_TIME = 60 * 1000

export function OnboardingChecklistSetting() {
	const [isDismissed, setIsDismissed] = React.useState<boolean | null>(null)

	const entriesQuery = useQuery({
		queryKey: MONTHLY_ENTRIES_KEY,
		queryFn: () => getMonthlyEntries(),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})
	const budgetsQuery = useQuery({
		queryKey: ["budgets"],
		queryFn: () => getBudgets(),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})
	const recurringQuery = useQuery({
		queryKey: ["recurringTemplates"],
		queryFn: () => listRecurringTemplates({ data: { includeInactive: false } }),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})
	const whatsappQuery = useQuery({
		queryKey: ["whatsappLinkStatus"],
		queryFn: () => getWhatsappLinkStatus(),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})

	React.useEffect(() => {
		setIsDismissed(readOnboardingChecklistDismissed())
	}, [])

	const completionMap = React.useMemo(() => {
		const hasExpense =
			entriesQuery.data?.entries.some(
				(entry) => entry.entryType === "Expense",
			) ?? false
		const hasRecurringIncome =
			recurringQuery.data?.some(
				(template) => template.entryType === "Income",
			) ?? false
		const hasBudget = (budgetsQuery.data?.length ?? 0) > 0
		const hasWhatsapp = whatsappQuery.data?.linked ?? false

		return {
			"add-expense": hasExpense,
			"add-recurring-income": hasRecurringIncome,
			"add-budget": hasBudget,
			"connect-whatsapp": hasWhatsapp,
		} satisfies Record<OnboardingChecklistItemId, boolean>
	}, [
		budgetsQuery.data,
		entriesQuery.data?.entries,
		recurringQuery.data,
		whatsappQuery.data?.linked,
	])

	const items = React.useMemo(
		() =>
			onboardingChecklistItems.map((item) => ({
				...item,
				isComplete: completionMap[item.id],
			})),
		[completionMap],
	)

	const isChecklistComplete = items.every((item) => item.isComplete)

	const isReady =
		(entriesQuery.isSuccess || entriesQuery.isError) &&
		(budgetsQuery.isSuccess || budgetsQuery.isError) &&
		(recurringQuery.isSuccess || recurringQuery.isError) &&
		(whatsappQuery.isSuccess || whatsappQuery.isError)

	if (isDismissed === null) return null
	if (!isReady) return null
	if (!isDismissed) return null
	if (isChecklistComplete) return null

	return (
		<div className="flex flex-col gap-6 rounded-xl border border-border/30 bg-card/30 py-6 text-card-foreground shadow-sm backdrop-blur-[3px] dark:bg-card/50">
			<div className="grid grid-cols-[1fr_auto] items-center gap-2 px-6">
				<div className="flex min-h-8 items-center font-semibold leading-tight">
					Onboarding checklist
				</div>
				<div className="justify-self-end">
					<Button
						onClick={() => {
							setOnboardingChecklistDismissed(false)
							setIsDismissed(false)
						}}
						variant="outline"
					>
						Re-enable checklist
					</Button>
				</div>
			</div>
		</div>
	)
}
