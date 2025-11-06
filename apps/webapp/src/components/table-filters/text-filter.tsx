import { SearchIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { TextFilter } from "@/core/functions/filters"
import { cn } from "@/lib/utils"

interface TextFilterComponentProps {
	value?: TextFilter
	onChange: (value: TextFilter | undefined) => void
	placeholder?: string
	searchPlaceholder?: string
	className?: string
}

export function TextFilterComponent({
	value,
	onChange,
	placeholder = "Search...",
	searchPlaceholder = "Type to search...",
	className,
}: TextFilterComponentProps) {
	const [open, setOpen] = React.useState(false)
	const [inputValue, setInputValue] = React.useState(value ?? "")

	React.useEffect(() => {
		setInputValue(value ?? "")
	}, [value])

	const handleApply = () => {
		const trimmed = inputValue.trim()
		onChange(trimmed || undefined)
		setOpen(false)
	}

	const handleClear = () => {
		setInputValue("")
		onChange(undefined)
		setOpen(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			handleApply()
		}
		if (e.key === "Escape") {
			setOpen(false)
		}
	}

	const hasValue = value?.trim()

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
					<SearchIcon className="mr-2 h-4 w-4" />
					<span className="truncate">
						{hasValue ? `"${value}"` : placeholder}
					</span>
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
						<h4 className="font-medium leading-none">Text Search</h4>
						<p className="text-muted-foreground text-sm">
							Search for text in this column
						</p>
					</div>
					<div className="space-y-2">
						<Input
							autoFocus
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={searchPlaceholder}
							value={inputValue}
						/>
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

