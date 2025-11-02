import { parseRRULE } from "@repo/data-ops/drizzle/queries"
import type { SelectRecurringEntryTemplate } from "@repo/data-ops/drizzle/schemas/index"
import { currencyData } from "@repo/shared-lib"
import { EditIcon, PauseIcon, PlayIcon, TrashIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { getCategoryIcon } from "@/config/categories"

export function RecurringTemplateItem({
	template,
	onEdit,
	onDelete,
	onToggleActive,
	showActions,
}: {
	template: SelectRecurringEntryTemplate
	onEdit: (id: string) => void
	onDelete: (id: string) => void
	onToggleActive: (id: string) => void
	showActions: boolean
}) {
	const categoryIcon = getCategoryIcon(template.category)
	const currencySymbol =
		currencyData[template.currency]?.symbol ?? template.currency

	const rruleDescription = React.useMemo(() => {
		try {
			const rrule = parseRRULE(template.rrule, template.dtstart)
			const text = rrule.toText()
			return text.charAt(0).toUpperCase() + text.slice(1)
		} catch {
			return "Invalid recurrence"
		}
	}, [template.rrule, template.dtstart])

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
						{!template.isActive && (
							<span className="ml-2 text-muted-foreground">(Paused)</span>
						)}
					</div>
				</div>
			</div>
			{showActions && (
				<div className="flex items-center gap-1">
					<Button
						aria-label="Edit recurring entry"
						onClick={() => onEdit(template.id)}
						size="icon"
						variant="ghost"
					>
						<EditIcon className="h-4 w-4" />
					</Button>
					<Button
						aria-label={
							template.isActive
								? "Pause recurring entry"
								: "Resume recurring entry"
						}
						onClick={() => onToggleActive(template.id)}
						size="icon"
						variant="ghost"
					>
						{template.isActive ? (
							<PauseIcon className="h-4 w-4" />
						) : (
							<PlayIcon className="h-4 w-4" />
						)}
					</Button>
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
