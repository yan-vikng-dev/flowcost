import { XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { NumberRangeFilter } from "@/core/functions/filters"
import { cn } from "@/lib/utils"

interface NumberRangeFilterComponentProps {
	value?: NumberRangeFilter
	onChange: (value: NumberRangeFilter | undefined) => void
	placeholder?: string
	minPlaceholder?: string
	maxPlaceholder?: string
	className?: string
	currency?: string
}

export function NumberRangeFilterComponent({
	value,
	onChange,
	placeholder = "Enter range",
	minPlaceholder = "Min",
	maxPlaceholder = "Max",
	className,
	currency,
}: NumberRangeFilterComponentProps) {
	const [open, setOpen] = React.useState(false)
	const [minValue, setMinValue] = React.useState(value?.min?.toString() ?? "")
	const [maxValue, setMaxValue] = React.useState(value?.max?.toString() ?? "")

	React.useEffect(() => {
		setMinValue(value?.min?.toString() ?? "")
		setMaxValue(value?.max?.toString() ?? "")
	}, [value])

	const handleApply = () => {
		const min = minValue ? parseFloat(minValue) : undefined
		const max = maxValue ? parseFloat(maxValue) : undefined

		if (min !== undefined || max !== undefined) {
			onChange({ min, max })
		} else {
			onChange(undefined)
		}
		setOpen(false)
	}

	const handleClear = () => {
		setMinValue("")
		setMaxValue("")
		onChange(undefined)
		setOpen(false)
	}

	const formatRange = () => {
		if (!value) return placeholder

		const minStr = value.min != null ? `${currency ?? ""}${value.min}` : ""
		const maxStr = value.max != null ? `${currency ?? ""}${value.max}` : ""

		if (minStr && maxStr) return `${minStr} - ${maxStr}`
		if (minStr) return `≥ ${minStr}`
		if (maxStr) return `≤ ${maxStr}`

		return placeholder
	}

	const hasValue = value && (value.min != null || value.max != null)

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					aria-expanded={open}
					className={cn(
						"h-8 w-full justify-start text-left font-normal",
						!hasValue && "text-muted-foreground",
						className,
					)}
					size="sm"
					variant="outline"
				>
					<span className="truncate">{formatRange()}</span>
					{hasValue && (
						<XIcon
							className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
							onClick={(e) => {
								e.stopPropagation()
								handleClear()
							}}
						/>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80">
				<div className="grid gap-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">Number Range</h4>
						<p className="text-muted-foreground text-sm">
							Set minimum and/or maximum values
						</p>
					</div>
					<div className="grid grid-cols-2 gap-2">
						<div className="space-y-2">
							<Label htmlFor="min-value">{minPlaceholder}</Label>
							<Input
								id="min-value"
								onChange={(e) => setMinValue(e.target.value)}
								placeholder={minPlaceholder}
								type="number"
								value={minValue}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="max-value">{maxPlaceholder}</Label>
							<Input
								id="max-value"
								onChange={(e) => setMaxValue(e.target.value)}
								placeholder={maxPlaceholder}
								type="number"
								value={maxValue}
							/>
						</div>
					</div>
					<div className="flex justify-end gap-2">
						<Button onClick={handleClear} size="sm" variant="outline">
							Clear
						</Button>
						<Button onClick={handleApply} size="sm">
							Apply
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}
