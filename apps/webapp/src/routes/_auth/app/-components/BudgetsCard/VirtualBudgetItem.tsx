import { type Currency, getCurrencySymbol } from "@repo/shared-config"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { formatNumber } from "./utils"

export type VirtualItemData = {
	label: string
	percent: number
	rightLabel?: string
	usage?: number
	cap?: number
	currency?: Currency
}

export type VirtualItemsMap = {
	"virtual:month-progress": VirtualItemData
	"virtual:free-budget": VirtualItemData | null
}

export function VirtualBudgetItem({ data }: { data: VirtualItemData }) {
	const pct = Math.max(0, Math.min(100, data.percent))
	const right =
		typeof data.rightLabel === "string" && data.rightLabel.length > 0
			? data.rightLabel
			: typeof data.usage === "number" && typeof data.cap === "number"
				? `${formatNumber(data.usage)}/${formatNumber(data.cap)}${
						data.currency ? ` ${getCurrencySymbol(data.currency)}` : ""
					}`
				: ""

	return (
		<div className="space-y-2 py-3">
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-2">
					<div className="flex flex-wrap gap-1">
						<Badge variant="secondary">{data.label}</Badge>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<span className="text-sm">
						{Math.round(pct)}% · {right}
					</span>
				</div>
			</div>
			<Progress value={pct} />
		</div>
	)
}
