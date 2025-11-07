import {
	type EntryType,
	entryTypes,
} from "@repo/data-ops/drizzle/schemas/index"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { getEntryTypeIcon } from "@/config/entryTypes"

export function EntryTypeSelect({
	value,
	onChange,
	placeholder = "Select type",
	disabled,
	className,
	id,
	invalid,
}: {
	value: EntryType
	onChange: (val: EntryType) => void
	placeholder?: string
	disabled?: boolean
	className?: string
	id?: string
	invalid?: boolean
}) {
	return (
		<Select disabled={disabled} onValueChange={onChange} value={value}>
			<SelectTrigger
				aria-invalid={invalid || undefined}
				className={className}
				id={id}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{entryTypes.map((t) => {
					const Icon = getEntryTypeIcon(t)
					return (
						<SelectItem key={t} value={t}>
							<span className="flex items-center gap-2">
								<span
									aria-hidden
									className="inline-flex w-5 shrink-0 justify-center leading-none"
								>
									<Icon className="size-4" />
								</span>
								<span>{t}</span>
							</span>
						</SelectItem>
					)
				})}
			</SelectContent>
		</Select>
	)
}
