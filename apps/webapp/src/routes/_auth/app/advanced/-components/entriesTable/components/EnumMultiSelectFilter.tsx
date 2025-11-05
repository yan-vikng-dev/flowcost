import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import type { EnumMultiSelectFilter } from "@/core/functions/filters"

interface EnumMultiSelectFilterProps {
	value: EnumMultiSelectFilter
	options: readonly string[]
	onChange: (value: EnumMultiSelectFilter) => void
}

export function EnumMultiSelectFilterComponent({
	value,
	options,
	onChange,
}: EnumMultiSelectFilterProps) {
	const selected = new Set(value)

	const toggleOption = (optionValue: string) => {
		const newValue = new Set(selected)
		if (newValue.has(optionValue)) {
			newValue.delete(optionValue)
		} else {
			newValue.add(optionValue)
		}
		onChange(Array.from(newValue))
	}

	return (
		<div className="p-2">
			<div className="space-y-1">
				{options.map((option) => {
					const isSelected = selected.has(option)
					return (
						<DropdownMenuCheckboxItem
							checked={isSelected}
							className="cursor-pointer"
							key={option}
							onCheckedChange={() => toggleOption(option)}
							onSelect={(event) => event.preventDefault()}
						>
							{option}
						</DropdownMenuCheckboxItem>
					)
				})}
			</div>
		</div>
	)
}
