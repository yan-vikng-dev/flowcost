import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { EnumMultiSelectFilter } from "@/core/functions/filters"
import { cn } from "@/lib/utils"

interface Option {
	value: string
	label: string
}

interface EnumMultiSelectFilterComponentProps {
	value?: EnumMultiSelectFilter
	onChange: (value: EnumMultiSelectFilter | undefined) => void
	options: Option[]
	placeholder?: string
	searchPlaceholder?: string
	className?: string
}

export function EnumMultiSelectFilterComponent({
	value = [],
	onChange,
	options,
	placeholder = "Select options",
	searchPlaceholder = "Search options...",
	className,
}: EnumMultiSelectFilterComponentProps) {
	const [open, setOpen] = React.useState(false)

	const selectedSet = React.useMemo(() => new Set(value), [value])

	const toggleOption = (optionValue: string) => {
		const newValue = new Set(selectedSet)
		if (newValue.has(optionValue)) {
			newValue.delete(optionValue)
		} else {
			newValue.add(optionValue)
		}

		const finalValue = Array.from(newValue)
		onChange(finalValue.length > 0 ? finalValue : undefined)
	}

	const clearFilter = (e: React.MouseEvent) => {
		e.stopPropagation()
		onChange(undefined)
		setOpen(false)
	}

	const selectedLabels = React.useMemo(() => {
		return options.filter((option) => selectedSet.has(option.value))
	}, [options, selectedSet])

	const triggerLabel =
		selectedLabels.length > 0
			? `${selectedLabels.length} selected`
			: placeholder

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className={cn(
						"h-8 w-full justify-between text-left font-normal",
						selectedLabels.length === 0 && "text-muted-foreground",
						className,
					)}
					size="sm"
					variant="outline"
				>
					<span className="truncate">{triggerLabel}</span>
					<div className="flex items-center gap-1">
						{selectedLabels.length > 0 && (
							<XIcon
								className="h-4 w-4 opacity-50 hover:opacity-100"
								onClick={clearFilter}
							/>
						)}
						<ChevronsUpDownIcon className="h-4 w-4 opacity-50" />
					</div>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>No options found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = selectedSet.has(option.value)
								return (
									<CommandItem
										key={option.value}
										onSelect={() => toggleOption(option.value)}
										value={option.value}
									>
										<CheckIcon
											className={cn(
												"mr-2 h-4 w-4",
												isSelected ? "opacity-100" : "opacity-0",
											)}
										/>
										<span>{option.label}</span>
									</CommandItem>
								)
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
