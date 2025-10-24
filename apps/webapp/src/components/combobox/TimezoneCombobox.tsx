import { ResponsiveCombobox } from "./ResponsiveCombobox"

export type TimezoneOption = { value: string; label: string }

export function TimezoneCombobox({
	value,
	onChange,
	options,
	placeholder = "Select timezone",
	disabled,
}: {
	value: string
	onChange: (val: string) => void
	options: TimezoneOption[]
	placeholder?: string
	disabled?: boolean
}) {
	return (
		<ResponsiveCombobox
			contentWidthClass="w-[280px]"
			disabled={disabled}
			items={options.map((opt) => ({
				value: opt.value,
				label: opt.label,
				keywords: [opt.value, opt.label],
			}))}
			onChange={onChange}
			placeholder={placeholder}
			value={value}
		/>
	)
}
