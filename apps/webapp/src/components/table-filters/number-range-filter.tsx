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
import { Slider } from "@/components/ui/slider"
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

interface NumericRangeSliderProps {
	value?: NumberRangeFilter
	onChange: (value: NumberRangeFilter | undefined) => void
	min: number
	max: number
	step?: number
	minLabel?: string
	maxLabel?: string
}

export function NumericRangeSlider({
	value,
	onChange,
	min,
	max,
	step = 1,
	minLabel = "Min",
	maxLabel = "Max",
}: NumericRangeSliderProps) {
	// Default to full range if no value is set
	const currentMin = value?.min ?? min
	const currentMax = value?.max ?? max

	const [sliderValue, setSliderValue] = React.useState<[number, number]>([
		currentMin,
		currentMax,
	])
	const [minInput, setMinInput] = React.useState(currentMin.toString())
	const [maxInput, setMaxInput] = React.useState(currentMax.toString())

	// Update local state when external value changes
	React.useEffect(() => {
		const newMin = value?.min ?? min
		const newMax = value?.max ?? max
		setSliderValue([newMin, newMax])
		setMinInput(newMin.toString())
		setMaxInput(newMax.toString())
	}, [value, min, max])

	const handleSliderChange = (newValue: number[]) => {
		const [newMin, newMax] = newValue as [number, number]
		setSliderValue([newMin, newMax])
		setMinInput(newMin.toString())
		setMaxInput(newMax.toString())

		if (newMin === min && newMax === max) {
			onChange(undefined) // Full range = no filter
		} else {
			onChange({ min: newMin, max: newMax })
		}
	}

	const handleMinInputChange = (inputValue: string) => {
		setMinInput(inputValue)
		const numValue = parseFloat(inputValue) || min

		// Clamp the value to valid range
		const clampedValue = Math.max(min, Math.min(numValue, sliderValue[1]))
		setSliderValue([clampedValue, sliderValue[1]])

		if (clampedValue === min && sliderValue[1] === max) {
			onChange(undefined)
		} else {
			onChange({ min: clampedValue, max: sliderValue[1] })
		}
	}

	const handleMaxInputChange = (inputValue: string) => {
		setMaxInput(inputValue)
		const numValue = parseFloat(inputValue) || max

		// Clamp the value to valid range
		const clampedValue = Math.min(max, Math.max(numValue, sliderValue[0]))
		setSliderValue([sliderValue[0], clampedValue])

		if (sliderValue[0] === min && clampedValue === max) {
			onChange(undefined)
		} else {
			onChange({ min: sliderValue[0], max: clampedValue })
		}
	}

	return (
		<div className="space-y-3">
			<Slider
				className="w-full"
				max={max}
				min={min}
				onValueChange={handleSliderChange}
				step={step}
				value={sliderValue}
			/>
			<div className="flex justify-between text-muted-foreground text-sm">
				<div className="flex items-center gap-2">
					<Label className="text-xs" htmlFor="min-range-input">
						{minLabel}:
					</Label>
					<Input
						className="h-7 w-20 text-xs"
						id="min-range-input"
						max={max}
						min={min}
						onChange={(e) => handleMinInputChange(e.target.value)}
						step={step}
						type="number"
						value={minInput}
					/>
				</div>
				<div className="flex items-center gap-2">
					<Label className="text-xs" htmlFor="max-range-input">
						{maxLabel}:
					</Label>
					<Input
						className="h-7 w-20 text-xs"
						id="max-range-input"
						max={max}
						min={min}
						onChange={(e) => handleMaxInputChange(e.target.value)}
						step={step}
						type="number"
						value={maxInput}
					/>
				</div>
			</div>
		</div>
	)
}
