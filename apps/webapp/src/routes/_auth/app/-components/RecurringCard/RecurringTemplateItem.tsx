import { parseRRULE } from "@repo/data-ops/drizzle/queries"
import type { SelectRecurringEntryTemplate } from "@repo/data-ops/drizzle/schemas/index"
import {
	currencyData,
	getCurrentMonthRange,
	getStartOfDayInTimezone,
} from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import { SquareIcon, TrashIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { getCategoryIcon } from "@/config/categories"
import { getUserPreferences } from "@/core/functions/preferences"

export function RecurringTemplateItem({
	template,
	onDelete,
	onStop,
	showActions,
}: {
	template: SelectRecurringEntryTemplate
	onDelete: (id: string) => void
	onStop: (id: string) => void
	showActions: boolean
}) {
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const timezone = prefsQuery.data?.timezone || "UTC"
	const { start: monthStart } = getCurrentMonthRange(timezone)
	const today = getStartOfDayInTimezone(new Date(), timezone)
	const isStopped = template.endAt !== null && template.endAt < monthStart
	const canStop = template.endAt === null || template.endAt >= today
	const categoryIcon = getCategoryIcon(template.category)
	const currencySymbol =
		currencyData[template.currency]?.symbol ?? template.currency

	const rruleDescription = React.useMemo(() => {
		try {
			const rrule = parseRRULE(
				template.rrule,
				template.dtstart,
				template.endAt ?? undefined,
				timezone,
			)
			const text = rrule.toText()
			return text.charAt(0).toUpperCase() + text.slice(1)
		} catch {
			return "Invalid recurrence"
		}
	}, [template.rrule, template.dtstart, template.endAt, timezone])

	const sign = template.entryType === "Income" ? "+" : "-"
	const signedAmount = `${sign}${currencySymbol}${template.amount.toFixed(2)}`

	return (
		<div className="flex items-center justify-between gap-4 py-3">
			<div className="flex flex-1 items-center gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="inline-flex w-5 shrink-0 justify-center leading-none sm:w-6">
							{React.createElement(categoryIcon, { className: "size-4" })}
						</span>
						<span className="font-medium">{template.category}</span>
						{template.description && (
							<span className="text-muted-foreground text-sm">
								{template.description}
							</span>
						)}
					</div>
					<div className="text-muted-foreground text-sm">
						{signedAmount} · {rruleDescription}
						{isStopped && (
							<span className="ml-2 text-muted-foreground">(Stopped)</span>
						)}
					</div>
				</div>
			</div>
			{showActions && (
				<div className="flex items-center gap-1">
					{canStop && (
						<Button
							aria-label="Stop recurring entry"
							onClick={() => onStop(template.id)}
							size="icon"
							variant="ghost"
						>
							<SquareIcon className="h-4 w-4" />
						</Button>
					)}
					<Button
						aria-label="Delete recurring entry"
						onClick={() => onDelete(template.id)}
						size="icon"
						variant="ghost"
					>
						<TrashIcon className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	)
}
