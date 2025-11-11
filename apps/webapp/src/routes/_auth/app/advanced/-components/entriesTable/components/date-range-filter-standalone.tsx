import { Calendar } from "@/components/ui/calendar"
import type { DateRangeFilter } from "@/core/functions/filters"

/**
 * Date range picker component for use inside PopoverContent.
 *
 * This component renders a Calendar with range selection mode.
 * It does NOT include its own Popover wrapper - it's designed to be used
 * inside an existing PopoverContent.
 *
 * @example
 * ```tsx
 * <Popover>
 *   <PopoverTrigger>Open filter</PopoverTrigger>
 *   <PopoverContent>
 *     <DateRangePicker
 *       value={filterValue}
 *       onChange={(range) => setFilterValue(range)}
 *       monthStart={monthStart}
 *     />
 *   </PopoverContent>
 * </Popover>
 * ```
 */
interface DateRangePickerProps {
	value?: DateRangeFilter
	onChange: (value: DateRangeFilter | undefined) => void
	monthStart?: Date
}

export function DateRangePicker({
	value,
	onChange,
	monthStart,
}: DateRangePickerProps) {
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
