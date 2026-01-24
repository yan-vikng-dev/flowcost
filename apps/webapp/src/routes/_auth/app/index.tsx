import { createFileRoute } from "@tanstack/react-router"
import { getCurrentUserMeta } from "@/core/functions/current-user"
import { getUserPreferences } from "@/core/functions/preferences"
import { listRecurringTemplates } from "@/core/functions/recurring-templates"
import { AddEntryButton } from "./-components/add-entry-button"
import { BudgetsCard } from "./-components/budgets-card"
import { ExpensesCard } from "./-components/expenses-by-category-bar"
import { SummaryCard } from "./-components/monthly-standard-summary"
import { OnboardingChecklistCard } from "./-components/onboarding-checklist-card"
import { RecurringCard } from "./-components/recurring-card"
import { WelcomeDialog } from "./-components/welcome-dialog"
import {
	EXCHANGE_RATES_KEY,
	getBudgets,
	getExchangeRatesForBudgets,
} from "./-functions/monthlyBudgets"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "./-functions/monthlyEntries"

export const Route = createFileRoute("/_auth/app/")({
	ssr: "data-only",
	loader: async ({ context }) => {
		context.queryClient.prefetchQuery({
			queryKey: MONTHLY_ENTRIES_KEY,
			queryFn: () => getMonthlyEntries(),
		})

		context.queryClient.prefetchQuery({
			queryKey: ["budgets"],
			queryFn: () => getBudgets(),
		})

		context.queryClient.prefetchQuery({
			queryKey: EXCHANGE_RATES_KEY,
			queryFn: () => getExchangeRatesForBudgets(),
		})

		context.queryClient.prefetchQuery({
			queryKey: ["userPreferences"],
			queryFn: () => getUserPreferences(),
		})

		context.queryClient.prefetchQuery({
			queryKey: ["recurringTemplates"],
			queryFn: () =>
				listRecurringTemplates({ data: { includeInactive: false } }),
		})

		context.queryClient.prefetchQuery({
			queryKey: ["connectionState"],
			queryFn: async () => {
				const mod = await import("./settings/-functions/connections")
				return mod.getConnectionState()
			},
		})

		context.queryClient.prefetchQuery({
			queryKey: ["currentUserMeta"],
			queryFn: () => getCurrentUserMeta(),
		})
	},
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			<WelcomeDialog />
			<div className="flex flex-col gap-4">
				<OnboardingChecklistCard />
				<BudgetsCard />
				<AddEntryButton />
				<ExpensesCard />
			</div>
			<div className="flex flex-col gap-4">
				<SummaryCard />
				<RecurringCard />
			</div>
		</div>
	)
}
