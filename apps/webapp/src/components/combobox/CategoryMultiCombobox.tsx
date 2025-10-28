import { type Category, categories } from "@repo/shared-config"
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { getCategoryIcon } from "@/config/categories"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { cn } from "@/lib/utils"

export function CategoryMultiCombobox({
	value,
	onChange,
	placeholder = "Select categories",
	className,
	id,
	invalid,
	contentWidthClass = "w-[280px]",
	maxVisibleChips = 3,
	disabledValues = [],
}: {
	value: Category[]
	onChange: (next: Category[]) => void
	placeholder?: string
	className?: string
	id?: string
	invalid?: boolean
	contentWidthClass?: string
	maxVisibleChips?: number
	disabledValues?: Category[]
}) {
	const [open, setOpen] = React.useState(false)
	const isDesktop = useIsDesktop()
	const listRef = React.useRef<HTMLDivElement | null>(null)
	const selected = React.useMemo(() => new Set(value), [value])

	const disabledSet = React.useMemo(
		() => new Set(disabledValues),
		[disabledValues],
	)

	function toggle(cat: Category) {
		// Prevent selecting disabled categories (unless already selected)
		if (disabledSet.has(cat) && !selected.has(cat)) return
		const next = new Set(selected)
		next.has(cat) ? next.delete(cat) : next.add(cat)
		onChange(Array.from(next))
	}

	const triggerClass = className

	const chips = (
		<div className="flex items-center gap-1">
			{value.slice(0, maxVisibleChips).map((c) => {
				const Icon = getCategoryIcon(c)
				return (
					<Badge className="px-1.5 py-0.5 text-xs" key={c} variant="secondary">
						<span className="mr-1 inline-flex w-4 justify-center">
							<Icon className="size-3.5" />
						</span>
						{c}
					</Badge>
				)
			})}
			{value.length > maxVisibleChips && (
				<Badge className="px-1.5 py-0.5 text-xs" variant="outline">
					+{value.length - maxVisibleChips}
				</Badge>
			)}
		</div>
	)

	// No clear-all button (as requested)
	const ClearButton = null

	const list = (
		<Command className={cn(!isDesktop && "rounded-none")}>
			<CommandInput
				className="h-9"
				onValueChange={() => {
					if (listRef.current) {
						listRef.current.scrollTop = 0
					}
				}}
				placeholder="Search categories..."
			/>
			<CommandList ref={listRef}>
				<CommandEmpty>No categories found.</CommandEmpty>
				<CommandGroup>
					{categories.map((cat) => {
						const Icon = getCategoryIcon(cat)
						const isSelected = selected.has(cat)
						const isDisabled = disabledSet.has(cat) && !isSelected
						return (
							<CommandItem
								disabled={isDisabled}
								key={cat}
								onSelect={() => toggle(cat)}
								value={cat}
							>
								<span className="mr-2 inline-flex w-5 justify-center">
									<Icon className="size-4" />
								</span>
								<span className="flex-1">{cat}</span>
								<CheckIcon
									className={cn(
										"size-4",
										isSelected ? "opacity-100" : "opacity-0",
									)}
								/>
							</CommandItem>
						)
					})}
				</CommandGroup>
			</CommandList>
		</Command>
	)

	const triggerLabel = value.length ? (
		chips
	) : (
		<span className="text-muted-foreground">{placeholder}</span>
	)

	if (isDesktop) {
		return (
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<Button
						aria-expanded={open}
						aria-invalid={invalid || undefined}
						className={triggerClass}
						data-placeholder={value.length ? undefined : true}
						id={id}
						type="button"
						variant="input"
					>
						{triggerLabel}
						<ChevronsUpDownIcon className="size-4 opacity-50" />
						{ClearButton}
					</Button>
				</PopoverTrigger>
				<PopoverContent
					align="start"
					className={cn(contentWidthClass, "max-h-[360px] p-0")}
				>
					{list}
				</PopoverContent>
			</Popover>
		)
	}

	return (
		<Drawer onOpenChange={setOpen} open={open}>
			<DrawerTrigger asChild>
				<Button
					aria-expanded={open}
					aria-invalid={invalid || undefined}
					className={triggerClass}
					id={id}
					type="button"
					variant="input"
				>
					{triggerLabel}
					<ChevronsUpDownIcon className="size-4 opacity-50" />
					{ClearButton}
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mt-2 border-t">{list}</div>
			</DrawerContent>
		</Drawer>
	)
}
