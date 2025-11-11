import { type Currency, getCurrencySymbol } from "@repo/shared-lib"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
	type FreeBudgetCalculation,
	FreeBudgetDialog,
} from "./free-budget-dialog"
import { formatNumber } from "./utils"

export type VirtualItemData = {
	label: string
	percent: number
	rightLabel?: string
	usage?: number
	cap?: number
	currency?: Currency
	showPercentLabel?: boolean
	freeBudgetCalculation?: FreeBudgetCalculation
}

export function VirtualBudgetItem({ data }: { data: VirtualItemData }) {
	const pct = Math.max(0, Math.min(100, data.percent))
	const currencyLabel = data.currency
		? ` ${getCurrencySymbol(data.currency)}`
		: ""
	const usageOnly = data.usage
		? `${formatNumber(data.usage)}${currencyLabel}`
		: undefined
	const usageWithCap =
		data.usage && data.cap
			? `${formatNumber(data.usage)}/${formatNumber(data.cap)}${currencyLabel}`
			: usageOnly
	const right = data.rightLabel ?? usageWithCap
	const showPercent = data.showPercentLabel !== false
	const leftText = showPercent ? `${Math.round(pct)}%` : ""
	const separator = leftText && right ? " · " : ""
	const showInfoButton =
		data.label === "Free budget" && data.freeBudgetCalculation && data.currency

	return (
		<div className="space-y-2 py-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5">
					<Badge variant="secondary">{data.label}</Badge>
					{showInfoButton && data.freeBudgetCalculation && data.currency && (
						<FreeBudgetDialog
							calculation={data.freeBudgetCalculation}
							currency={data.currency}
						/>
					)}
				</div>
				<span className="text-sm">
					{leftText}
					{separator}
					{right}
				</span>
			</div>
			<Progress progressColor="var(--amount-positive)" value={pct} />
		</div>
	)
}
