import { CalendarIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { DateRangeFilter } from "@/core/functions/filters"
import { cn } from "@/lib/utils"

interface DateRangeFilterComponentProps {
	value?: DateRangeFilter
	onChange: (value: DateRangeFilter | undefined) => void
	placeholder?: string
	className?: string
}

export function DateRangeFilterComponent({
	value,
	onChange,
	placeholder = "Pick a date range",
	className,
}: DateRangeFilterComponentProps) {
	const [open, setOpen] = React.useState(false)

	const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
		onChange(range)
		if (range?.from && range?.to) {
			setOpen(false)
		}
	}

	const clearFilter = (e: React.MouseEvent) => {
		e.stopPropagation()
		onChange(undefined)
		setOpen(false)
	}

	const formatRange = () => {
		if (!value?.from) return placeholder

		const fromStr = value.from.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		})

		if (!value.to) return `From ${fromStr}`

		const toStr = value.to.toLocaleDateString(undefined, {
			month: "short",
			day: "numeric",
			year: "numeric",
		})

		return `${fromStr} - ${toStr}`
	}

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className={cn(
						"h-8 w-full justify-start text-left font-normal",
						!value && "text-muted-foreground",
						className,
					)}
					size="sm"
					variant="outline"
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					<span className="truncate">{formatRange()}</span>
					{value && (
						<XIcon
							className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
							onClick={clearFilter}
						/>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar
					defaultMonth={value?.from}
					mode="range"
					numberOfMonths={2}
					onSelect={handleSelect}
					selected={{
						from: value?.from,
						to: value?.to,
					}}
				/>
			</PopoverContent>
		</Popover>
	)
}

