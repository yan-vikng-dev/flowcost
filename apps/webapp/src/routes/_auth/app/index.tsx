import { createFileRoute } from "@tanstack/react-router"
import { getUserPreferences } from "@/core/functions/preferences"
import { listRecurringTemplates } from "@/core/functions/recurring-templates"
import { BudgetsCard } from "./-components/BudgetsCard"
import { ExpensesByCategoryBar } from "./-components/ExpensesByCategoryBar"
import { MonthlyStandardSummary } from "./-components/MonthlyStandardSummary"
import { RecurringCard } from "./-components/RecurringCard"
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
				<ExpensesByCategoryBar />
			</div>
			<div className="flex flex-1 flex-col gap-4">
				<MonthlyStandardSummary />
				<RecurringCard />
			</div>
		</div>
	)
}
