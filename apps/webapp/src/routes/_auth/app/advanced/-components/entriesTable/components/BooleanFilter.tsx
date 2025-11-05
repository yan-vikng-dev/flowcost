import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu"
import type { BooleanFilter } from "@/core/functions/filters"

interface BooleanFilterProps {
	value: BooleanFilter | undefined
	onChange: (value: BooleanFilter | undefined) => void
	trueLabel: string
	falseLabel: string
}

export function BooleanFilterComponent({
	value,
	onChange,
	trueLabel,
	falseLabel,
}: BooleanFilterProps) {
	const isTrueSelected = value === true
	const isFalseSelected = value === false

	const toggleTrue = () => {
		if (isTrueSelected) {
			onChange(undefined)
		} else {
			onChange(true)
		}
	}

	const toggleFalse = () => {
		if (isFalseSelected) {
			onChange(undefined)
		} else {
			onChange(false)
		}
	}

	return (
		<div className="p-2">
			<div className="space-y-1">
				<DropdownMenuCheckboxItem
					checked={isTrueSelected}
					className="cursor-pointer"
					onCheckedChange={toggleTrue}
					onSelect={(event) => event.preventDefault()}
				>
					{trueLabel}
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem
					checked={isFalseSelected}
					className="cursor-pointer"
					onCheckedChange={toggleFalse}
					onSelect={(event) => event.preventDefault()}
				>
					{falseLabel}
				</DropdownMenuCheckboxItem>
			</div>
		</div>
	)
}
