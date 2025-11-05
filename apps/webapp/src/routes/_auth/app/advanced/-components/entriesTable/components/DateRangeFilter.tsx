import { Calendar } from "@/components/ui/calendar"
import type { DateRangeFilter } from "@/core/functions/filters"

interface DateRangeFilterProps {
	value: DateRangeFilter
	onChange: (value: DateRangeFilter | undefined) => void
	monthStart?: Date
}

export function DateRangeFilterComponent({
	value,
	onChange,
	monthStart,
}: DateRangeFilterProps) {
	return (
		<Calendar
			defaultMonth={monthStart}
			hidden={(date) => (monthStart ? date < monthStart : false)}
			hideNavigation
			mode="range"
			numberOfMonths={1}
			onSelect={(range) => onChange(range)}
			selected={{
				from: value?.from,
				to: value?.to,
			}}
			showOutsideDays={false}
		/>
	)
}
