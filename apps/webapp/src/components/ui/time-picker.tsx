/**
 * Simple Time Picker - Adapted from shadcn-datetime-picker
 * Original: https://github.com/huybuidac/shadcn-datetime-picker
 * Adapted to work with HH:MM string format (24-hour, no seconds)
 */

import { CheckIcon, ChevronDownIcon, Clock } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface TimeOption {
	value: number
	label: string
	disabled?: boolean
}

interface TimePickerProps {
	value: string
	onChange: (value: string) => void
	disabled?: boolean
	className?: string
	id?: string
}

function parseTime(timeStr: string): { hour: number; minute: number } {
	const parts = timeStr.split(":")
	const hours = parts[0] ? Number.parseInt(parts[0], 10) : 0
	const minutes = parts[1] ? Number.parseInt(parts[1], 10) : 0
	return {
		hour: Number.isNaN(hours) ? 0 : hours,
		minute: Number.isNaN(minutes) ? 0 : minutes,
	}
}

function formatTime(hour: number, minute: number): string {
	return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
}

export function TimePicker({
	value,
	onChange,
	disabled = false,
	className,
	id,
}: TimePickerProps) {
	const { hour: initialHour, minute: initialMinute } = parseTime(value)
	const [hour, setHour] = useState(initialHour)
	const [minute, setMinute] = useState(initialMinute)
	const [open, setOpen] = useState(false)

	useEffect(() => {
		const { hour: h, minute: m } = parseTime(value)
		if (h !== hour || m !== minute) {
			setHour(h)
			setMinute(m)
		}
	}, [value, hour, minute])

	const hours: TimeOption[] = useMemo(
		() =>
			Array.from({ length: 24 }, (_, i) => ({
				value: i,
				label: i.toString().padStart(2, "0"),
			})),
		[],
	)

	const minutes: TimeOption[] = useMemo(
		() =>
			Array.from({ length: 60 }, (_, i) => ({
				value: i,
				label: i.toString().padStart(2, "0"),
			})),
		[],
	)

	const hourRef = useRef<HTMLDivElement>(null)
	const minuteRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		const timeoutId = setTimeout(() => {
			if (open) {
				hourRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
				minuteRef.current?.scrollIntoView({
					behavior: "smooth",
					block: "center",
				})
			}
		}, 100)
		return () => clearTimeout(timeoutId)
	}, [open])

	const onHourChange = useCallback(
		(v: TimeOption) => {
			setHour(v.value)
			onChange(formatTime(v.value, minute))
		},
		[minute, onChange],
	)

	const onMinuteChange = useCallback(
		(v: TimeOption) => {
			setMinute(v.value)
			onChange(formatTime(hour, v.value))
		},
		[hour, onChange],
	)

	const display = formatTime(hour, minute)

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<Button
					className={cn(
						"min-w-[7.5rem] justify-between border border-input bg-transparent font-normal shadow-xs dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
						!value && "text-muted-foreground",
						className,
					)}
					disabled={disabled}
					id={id}
					variant="ghost"
				>
					<Clock className="mr-2 size-4" />
					{display}
					<ChevronDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<div className="flex-col gap-2 p-2">
					<div className="flex h-56 grow">
						<ScrollArea className="h-full grow">
							<div className="flex grow flex-col items-stretch pe-2">
								{hours.map((v) => (
									<div
										key={v.value}
										ref={v.value === hour ? hourRef : undefined}
									>
										<TimeItem
											className="h-8"
											onSelect={onHourChange}
											option={v}
											selected={v.value === hour}
										/>
									</div>
								))}
							</div>
						</ScrollArea>
						<ScrollArea className="h-full grow">
							<div className="flex grow flex-col items-stretch pe-2">
								{minutes.map((v) => (
									<div
										key={v.value}
										ref={v.value === minute ? minuteRef : undefined}
									>
										<TimeItem
											className="h-8"
											onSelect={onMinuteChange}
											option={v}
											selected={v.value === minute}
										/>
									</div>
								))}
							</div>
						</ScrollArea>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	)
}

const TimeItem = ({
	option,
	selected,
	onSelect,
	className,
}: {
	option: TimeOption
	selected: boolean
	onSelect: (option: TimeOption) => void
	className?: string
}) => {
	return (
		<Button
			className={cn(
				"flex w-full justify-center px-1 text-sm",
				selected && "bg-accent text-accent-foreground",
				className,
			)}
			onClick={() => onSelect(option)}
			variant="ghost"
		>
			<div className="w-4">
				{selected && <CheckIcon className="my-auto size-4" />}
			</div>
			<span className="ml-2">{option.label}</span>
		</Button>
	)
}
