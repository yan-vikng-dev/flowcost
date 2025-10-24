import {
	type EntryType,
	entryTypes,
} from "@repo/data-ops/drizzle/schemas/entries/table"
import { getEntryTypeIcon } from "@/config/entryTypes"
import { ResponsiveCombobox } from "./ResponsiveCombobox"

export function EntryTypeCombobox({
	value,
	onChange,
	placeholder = "Select type",
	disabled,
	className,
}: {
	value: EntryType
	onChange: (val: EntryType) => void
	placeholder?: string
	disabled?: boolean
	className?: string
}) {
	return (
		<ResponsiveCombobox
			className={className}
			disabled={disabled}
			items={entryTypes.map((t) => {
				const Icon = getEntryTypeIcon(t)
				return {
					value: t,
					ariaLabel: t,
					label: (
						<span className="flex items-center gap-2">
							<span
								aria-hidden
								className="inline-flex w-5 shrink-0 justify-center leading-none sm:w-6"
							>
								<Icon className="size-4" />
							</span>
							<span>{t}</span>
						</span>
					),
					triggerLabel: (
						<span className="flex items-center gap-2">
							<span
								aria-hidden
								className="inline-flex w-5 shrink-0 justify-center leading-none sm:w-6"
							>
								<Icon className="size-4" />
							</span>
							<span className="hidden sm:inline">{t}</span>
						</span>
					),
				}
			})}
			onChange={onChange}
			placeholder={placeholder}
			value={value}
		/>
	)
}
