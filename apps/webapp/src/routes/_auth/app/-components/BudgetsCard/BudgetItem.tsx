import { type Currency, getCurrencySymbol } from "@repo/shared-config"
import { PencilIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { BudgetWithProgress } from "@/core/functions/budgets"
import { CategoryChips } from "./CategoryChips"
import { formatNumber } from "./utils"

export function BudgetItem({
	budget,
	onEdit,
	onDelete,
	showActions = false,
}: {
	budget: BudgetWithProgress
	onEdit: (id: string) => void
	onDelete: (id: string) => void
	showActions?: boolean
}) {
	const currencySymbol = getCurrencySymbol(budget.displayCurrency as Currency)
	const amountText = `${formatNumber(budget.spentDisplay)}/${formatNumber(budget.amountDisplay)} ${currencySymbol}`

	return (
		<div className="space-y-2 py-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<CategoryChips categories={budget.categories} />
				</div>
				<div className="flex items-center gap-2">
					{showActions ? (
						<>
							<span className="text-sm">{amountText}</span>
							<Button
								aria-label="Edit budget"
								onClick={() => onEdit(budget.id)}
								size="icon-xs"
								variant="secondary"
							>
								<PencilIcon />
							</Button>
							<Button
								aria-label="Delete budget"
								onClick={() => onDelete(budget.id)}
								size="icon-xs"
								variant="secondary"
							>
								<Trash2Icon />
							</Button>
						</>
					) : (
						<span className="text-sm">
							{Math.round(budget.utilizationPct)}% · {amountText}
						</span>
					)}
				</div>
			</div>
			<Progress value={budget.utilizationPct} />
		</div>
	)
}
