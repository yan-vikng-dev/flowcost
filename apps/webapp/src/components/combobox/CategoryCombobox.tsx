import { type Category, categories } from "@repo/shared-lib"
import { getCategoryIcon } from "@/config/categories"
import { ResponsiveCombobox } from "./ResponsiveCombobox"

export function CategoryCombobox({
	value,
	onChange,
	disabled,
	className,
	id,
	invalid,
}: {
	value: Category
	onChange: (val: Category) => void
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
			items={categories.map((cat) => {
				const Icon = getCategoryIcon(cat)
				return {
					value: cat,
					ariaLabel: cat,
					label: (
						<span className="flex items-center gap-2">
							<span
								aria-hidden
								className="inline-flex w-5 shrink-0 justify-center leading-none sm:w-6"
							>
								<Icon className="size-4" />
							</span>
							<span>{cat}</span>
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
							<span className="hidden sm:inline">{cat}</span>
						</span>
					),
				}
			})}
			onChange={onChange}
			placeholder="Select category"
			value={value}
		/>
	)
}
