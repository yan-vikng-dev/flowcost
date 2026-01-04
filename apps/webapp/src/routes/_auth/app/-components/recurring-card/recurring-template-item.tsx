import { parseRRULE } from "@repo/db/drizzle/queries"
import type { SelectRecurringEntryTemplate } from "@repo/db/drizzle/schemas/index"
import {
	formatCurrency,
	getCurrentMonthRange,
	isoDateToUtcMidnight,
	toIsoDateInTimezone,
} from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import { SquareIcon, TrashIcon } from "lucide-react"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
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
	const monthStartIso = toIsoDateInTimezone(monthStart, timezone)
	const todayIso = toIsoDateInTimezone(new Date(), timezone)
	const isStopped =
		template.endDate !== null && template.endDate < monthStartIso
	const canStop = template.endDate === null || template.endDate > todayIso
	const CategoryIcon = getCategoryIcon(template.category)

	const rruleDescription = React.useMemo(() => {
		try {
			const dtstart = isoDateToUtcMidnight(template.dtstartDate)
			const until = template.endDate
				? isoDateToUtcMidnight(template.endDate)
				: undefined
			const rrule = parseRRULE(template.rrule, dtstart, until, timezone)
			const text = rrule.toText()
			return text.charAt(0).toUpperCase() + text.slice(1)
		} catch {
			return "Invalid recurrence"
		}
	}, [template.rrule, template.dtstartDate, template.endDate, timezone])

	const sign = template.entryType === "Income" ? "+" : "-"
	const signedAmount = `${sign}${formatCurrency(template.amount, template.currency)}`

	return (
		<div className="flex items-center justify-between gap-4 py-3">
			<div className="flex flex-1 items-center gap-3">
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<Badge variant="secondary">
							<span className="mr-1 inline-flex w-4 justify-center">
								<CategoryIcon className="size-3.5" />
							</span>
							{template.category}
						</Badge>
						<span className="text-sm">{signedAmount}</span>
						{template.description && (
							<span className="text-muted-foreground text-sm">
								{template.description}
							</span>
						)}
					</div>
					<div className="text-muted-foreground text-sm">
						{rruleDescription}
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
