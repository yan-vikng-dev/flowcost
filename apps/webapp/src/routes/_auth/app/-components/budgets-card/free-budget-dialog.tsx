import { type Currency, getCurrencySymbol } from "@repo/shared-lib"
import { InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { formatNumber } from "./utils"

export type FreeBudgetCalculation = {
	incomeSum: number
	committedBudgets: number
	recurringExpenseSum: number
	committed: number
	cap: number
	unbudgetedExpenseSum: number
}

export function FreeBudgetDialog({
	calculation,
	currency,
}: {
	calculation: FreeBudgetCalculation
	currency: Currency
}) {
	const currencySymbol = getCurrencySymbol(currency)

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					aria-label="Free budget explanation"
					className="size-5"
					size="icon-sm"
					variant="ghost"
				>
					<InfoIcon className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Free Budget</DialogTitle>
					<DialogDescription>
						Shows unallocated, available finances for anything that isn't
						budgeted.
					</DialogDescription>
				</DialogHeader>
				<div className="rounded-md bg-muted p-3 text-sm">
					<p className="font-medium">Formula:</p>
					<p className="mt-2 font-mono">
						Free Budget = Income - (Committed Budgets + Recurring Expenses)
					</p>
					<p className="mt-2 font-mono">
						{formatNumber(calculation.cap)}
						{currencySymbol} = {formatNumber(calculation.incomeSum)}
						{currencySymbol} - ({formatNumber(calculation.committedBudgets)}
						{currencySymbol} + {formatNumber(calculation.recurringExpenseSum)}
						{currencySymbol})
					</p>
				</div>
			</DialogContent>
		</Dialog>
	)
}
