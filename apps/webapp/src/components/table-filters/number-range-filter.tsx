import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { NumberRangeFilter } from "@/core/functions/filters"

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
