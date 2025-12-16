import { createFileRoute } from "@tanstack/react-router"
import { getUserPreferences } from "@/core/functions/preferences"
import { listRecurringTemplates } from "@/core/functions/recurring-templates"
import { AddEntryButton } from "./-components/add-entry-button"
import { BudgetsCard } from "./-components/budgets-card"
import { ExpensesCard } from "./-components/expenses-by-category-bar"
import { SummaryCard } from "./-components/monthly-standard-summary"
import { RecurringCard } from "./-components/recurring-card"
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
	},
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="flex flex-col gap-4 md:flex-row md:items-start">
			<div className="flex flex-1 flex-col gap-4">
				<BudgetsCard />
				<ExpensesCard />
				<AddEntryButton />
			</div>
			<div className="flex flex-1 flex-col gap-4">
				<SummaryCard />
				<RecurringCard />
			</div>
		</div>
	)
}
