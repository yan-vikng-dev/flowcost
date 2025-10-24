import {
	type Currency,
	currencies,
	getCurrencyName,
	getCurrencySymbol,
} from "@repo/shared-config"
import { ResponsiveCombobox } from "./ResponsiveCombobox"

export function CurrencyCombobox({
	value,
	onChange,
	placeholder = "Select currency",
	disabled,
	className,
	id,
	invalid,
}: {
	value: Currency
	onChange: (val: Currency) => void
	placeholder?: string
	disabled?: boolean
	className?: string
	id?: string
	invalid?: boolean
}) {
	return (
		<ResponsiveCombobox
			className={className}
			disabled={disabled}
			id={id}
			invalid={invalid}
			items={currencies.map((c) => ({
				value: c,
				ariaLabel: c,
				label: (
					<span className="flex items-center gap-2">
						<span
							aria-hidden
							className="inline-flex w-5 shrink-0 justify-center font-mono text-muted-foreground tabular-nums leading-none sm:w-6"
						>
							{getCurrencySymbol(c)}
						</span>
						<span>{c}</span>
					</span>
				),
				triggerLabel: (
					<span className="flex items-center gap-2">
						<span
							aria-hidden
							className="inline-flex w-5 shrink-0 justify-center font-mono text-muted-foreground tabular-nums leading-none sm:w-6"
						>
							{getCurrencySymbol(c)}
						</span>
						<span className="hidden sm:inline">{c}</span>
					</span>
				),
				keywords: [getCurrencyName(c)],
			}))}
			onChange={onChange}
			placeholder={placeholder}
			value={value}
		/>
	)
}
