import { createFileRoute } from "@tanstack/react-router"
import { getUserPreferences } from "@/core/functions/preferences"
import { ExpensesByCategoryBar } from "./-components/expensesByCategoryBar"
import { IncomeByCategoryDonut } from "./-components/incomeByCategoryDonut"
import { MonthlyStandardSummary } from "./-components/monthlyStandardSummary"
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
	},
	component: RouteComponent,
})

function RouteComponent() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<MonthlyStandardSummary />
			<ExpensesByCategoryBar />
			<IncomeByCategoryDonut />
		</div>
	)
}
