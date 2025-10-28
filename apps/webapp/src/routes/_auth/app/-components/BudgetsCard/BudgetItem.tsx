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
}: {
	budget: BudgetWithProgress
	onEdit: (id: string) => void
	onDelete: (id: string) => void
}) {
	return (
		<div className="space-y-2 rounded-md border p-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<CategoryChips categories={budget.categories} />
				</div>
				<div className="flex items-center gap-2">
					<Button
						aria-label="Edit budget"
						onClick={() => onEdit(budget.id)}
						size="icon-sm"
						variant="secondary"
					>
						<PencilIcon />
					</Button>
					<Button
						aria-label="Delete budget"
						onClick={() => onDelete(budget.id)}
						size="icon-sm"
						variant="secondary"
					>
						<Trash2Icon />
					</Button>
				</div>
			</div>
			<div className="flex items-center justify-between text-sm">
				<span>{Math.round(budget.utilizationPct)}%</span>
				<span className="text-right">
					{formatNumber(budget.spentDisplay)}/
					{formatNumber(budget.amountDisplay)}{" "}
					{getCurrencySymbol(budget.displayCurrency as Currency)}
				</span>
			</div>
			<Progress value={budget.utilizationPct} />
		</div>
	)
}
