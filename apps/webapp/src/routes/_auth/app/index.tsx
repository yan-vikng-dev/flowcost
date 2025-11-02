import { createFileRoute } from "@tanstack/react-router"
import { listBudgetsWithProgress } from "@/core/functions/budgets"
import { getUserPreferences } from "@/core/functions/preferences"
import { BudgetsCard } from "./-components/BudgetsCard"
import { ExpensesByCategoryBar } from "./-components/ExpensesByCategoryBar"
import { MonthlyStandardSummary } from "./-components/MonthlyStandardSummary"
import { RecurringCard } from "./-components/RecurringCard"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "./-functions/monthlyEntries"

export const Route = createFileRoute("/_auth/app/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData({
			queryKey: ["userPreferences"],
			queryFn: () => getUserPreferences(),
		})

		// Prefetch monthly entries once
		await context.queryClient.ensureQueryData({
			queryKey: MONTHLY_ENTRIES_KEY,
			queryFn: () => getMonthlyEntries(),
		})

		// Prefetch budgets list
		await context.queryClient.ensureQueryData({
			queryKey: ["budgets:list"],
			queryFn: () => listBudgetsWithProgress(),
		})

		// Prefetch connection state (for partner labeling)
		await context.queryClient.ensureQueryData({
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
				<MonthlyStandardSummary />
				<BudgetsCard />
			</div>
			<div className="flex flex-1 flex-col gap-4">
				<RecurringCard />
				<ExpensesByCategoryBar />
			</div>
		</div>
	)
}
