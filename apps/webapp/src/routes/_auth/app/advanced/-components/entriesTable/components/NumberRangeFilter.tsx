import type { Column } from "@tanstack/react-table"
import { NumericRangeSlider } from "@/components/table-filters"
import type { MonthlyEntry } from "@/core/functions/entries"
import type { NumberRangeFilter } from "@/core/functions/filters"

interface NumberRangeFilterProps {
	value: NumberRangeFilter
	onChange: (value: NumberRangeFilter | undefined) => void
	column: Column<MonthlyEntry, unknown>
	maxLabel: string
	minLabel: string
}

export function NumberRangeFilterComponent({
	value,
	onChange,
	column,
	maxLabel,
	minLabel,
}: NumberRangeFilterProps) {
	const maxValue = Math.max(
		1,
		Math.ceil(
			column.getFacetedRowModel().rows.reduce((max, row) => {
				const val = row.getValue(column.id) as number | null
				return val && val > max ? val : max
			}, 0) * 1.1,
		),
	)

	return (
		<NumericRangeSlider
			max={maxValue}
			maxLabel={maxLabel}
			min={0}
			minLabel={minLabel}
			onChange={onChange}
			step={1}
			value={value}
		/>
	)
}
