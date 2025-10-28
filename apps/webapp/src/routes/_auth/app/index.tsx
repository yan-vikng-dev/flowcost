import { createFileRoute } from "@tanstack/react-router"
import { listBudgetsWithProgress } from "@/core/functions/budgets"
import { getUserPreferences } from "@/core/functions/preferences"
import { BudgetsCard } from "./-components/BudgetsCard"
import { ExpensesByCategoryBar } from "./-components/ExpensesByCategoryBar"
import { IncomeByCategoryDonut } from "./-components/IncomeByCategoryDonut"
import { MonthlyStandardSummary } from "./-components/MonthlyStandardSummary"
import { getMonthlyEntriesForCharts } from "./-functions/monthlyEntries"

export const Route = createFileRoute("/_auth/app/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData({
			queryKey: ["userPreferences"],
			queryFn: () => getUserPreferences(),
		})

		// Prefetch monthly entries for charts once
		await context.queryClient.ensureQueryData({
			queryKey: ["monthlyEntriesForCharts"],
			queryFn: () => getMonthlyEntriesForCharts(),
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
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<BudgetsCard />
			<MonthlyStandardSummary />
			<ExpensesByCategoryBar />
			<IncomeByCategoryDonut />
		</div>
	)
}
