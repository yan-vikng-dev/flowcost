import { createFileRoute } from "@tanstack/react-router"
import { WalletIcon } from "lucide-react"

export const Route = createFileRoute("/docs/features/budgets")({
	component: BudgetsDocsPage,
})

function BudgetsDocsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<WalletIcon className="h-6 w-6 text-primary" />
					<h1 className="font-semibold text-3xl tracking-tight">Budgets</h1>
				</div>
			</div>
			<section className="scroll-mt-28 space-y-3" id="budget-structure">
				<h2 className="font-semibold text-2xl">Budget structure</h2>
				<div className="space-y-4 text-sm">
					<p>
						Budgets are category-based limits with a currency and one or more
						assigned categories. They are scoped to your current month.
					</p>
					<p>
						You can create multiple budgets and reuse categories as needed to
						match how you track spending.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="budget-progress">
				<h2 className="font-semibold text-2xl">Progress math</h2>
				<div className="space-y-4 text-sm">
					<p>
						Progress is calculated from current-month expense entries. If you
						log spending in multiple currencies, totals are converted into your
						display currency using the latest exchange rates.
					</p>
					<p>
						This keeps progress consistent across categories, even when entries
						come from different accounts or regions.
					</p>
				</div>
			</section>
		</div>
	)
}
