import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
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
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { cn } from "@/lib/utils"

export type ComboItem<T extends string> = {
	value: T
	label: React.ReactNode
	keywords?: string[]
	ariaLabel?: string
	triggerLabel?: React.ReactNode
}

export function ResponsiveCombobox<T extends string>({
	value,
	onChange,
	items,
	placeholder,
	disabled,
	className,
	contentWidthClass = "w-[220px]",
	id,
	invalid,
}: {
	value: T
	onChange: (val: T) => void
	items: Array<ComboItem<T>>
	placeholder: string
	disabled?: boolean
	className?: string
	contentWidthClass?: string
	id?: string
	invalid?: boolean
}) {
	const [open, setOpen] = React.useState(false)
	const isDesktop = useIsDesktop()
	const listRef = React.useRef<HTMLDivElement | null>(null)

	const current = items.find((i) => i.value === value)

	const triggerClass = className

	const list = (
		<Command className={cn(!isDesktop && "rounded-none")}>
			<CommandInput
				className="h-9"
				onValueChange={() => {
					if (listRef.current) {
						listRef.current.scrollTop = 0
					}
				}}
				placeholder="Search..."
			/>
			<CommandList ref={listRef}>
				<CommandEmpty>No results found.</CommandEmpty>
				<CommandGroup>
					{items.map((item) => (
						<CommandItem
							key={item.value}
							keywords={item.keywords}
							onSelect={(val) => {
								onChange(val as T)
								setOpen(false)
							}}
							value={item.value}
						>
							{item.label}
							<CheckIcon
								className={cn(
									"ml-auto size-4",
									value === item.value ? "opacity-100" : "opacity-0",
								)}
							/>
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	)

	if (isDesktop) {
		return (
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<Button
						aria-expanded={open}
						aria-invalid={invalid || undefined}
						aria-label={
							current
								? (current.ariaLabel ?? String(current.value))
								: placeholder
						}
						className={triggerClass}
						data-placeholder={current ? undefined : true}
						disabled={disabled}
						id={id}
						role="combobox"
						type="button"
						variant="input"
					>
						{current ? (current.triggerLabel ?? current.label) : placeholder}
						<ChevronsUpDownIcon className="size-4 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className={cn(contentWidthClass, "p-0")}>
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
					aria-label={
						current ? (current.ariaLabel ?? String(current.value)) : placeholder
					}
					className={triggerClass}
					data-placeholder={current ? undefined : true}
					disabled={disabled}
					id={id}
					role="combobox"
					type="button"
					variant="input"
				>
					{current ? (current.triggerLabel ?? current.label) : placeholder}
					<ChevronsUpDownIcon className="size-4 opacity-50" />
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="mt-2 border-t">{list}</div>
			</DrawerContent>
		</Drawer>
	)
}
