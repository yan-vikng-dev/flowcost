import type { Category, Currency } from "@repo/shared-config"
import * as React from "react"
import { CategoryMultiCombobox } from "@/components/combobox/CategoryMultiCombobox"
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { parseAmountInput } from "./utils"

export type FormState = {
	amount: number | ""
	currency: Currency
	categories: Category[]
}

export function BudgetDialog({
	open,
	onOpenChange,
	initial,
	onSubmit,
	title,
	submitLabel,
	disabledValues,
}: {
	open: boolean
	onOpenChange: (isOpen: boolean) => void
	initial: FormState
	onSubmit: (state: FormState) => void
	title: string
	submitLabel: string
	disabledValues?: Category[]
}) {
	const [state, setState] = React.useState<FormState>(initial)
	const amountId = React.useId()
	const currencyId = React.useId()
	const categoriesId = React.useId()
	React.useEffect(() => setState(initial), [initial])

	const valid =
		typeof state.amount === "number" &&
		state.amount > 0 &&
		state.categories.length > 0

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Set a monthly limit for selected categories.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="flex gap-4">
						<Field className="w-auto flex-none shrink-0">
							<FieldLabel htmlFor={currencyId}>Currency</FieldLabel>
							<CurrencyCombobox
								id={currencyId}
								onChange={(currency) =>
									setState((prevState) => ({ ...prevState, currency }))
								}
								value={state.currency}
							/>
						</Field>
						<Field className="min-w-0 flex-1">
							<FieldLabel htmlFor={amountId}>Monthly amount</FieldLabel>
							<Input
								id={amountId}
								inputMode="decimal"
								onChange={(event) =>
									setState((prevState) => ({
										...prevState,
										amount: parseAmountInput(
											event.target.value,
											prevState.amount,
										),
									}))
								}
								placeholder="0.00"
								value={state.amount}
							/>
						</Field>
					</div>

					<Field>
						<FieldLabel htmlFor={categoriesId}>Categories</FieldLabel>
						<CategoryMultiCombobox
							disabledValues={disabledValues}
							id={categoriesId}
							onChange={(categories) =>
								setState((prevState) => ({ ...prevState, categories }))
							}
							value={state.categories}
						/>
					</Field>
				</div>
				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						Cancel
					</Button>
					<Button
						disabled={!valid}
						onClick={() =>
							valid &&
							onSubmit({
								amount: state.amount === "" ? 0 : state.amount,
								currency: state.currency,
								categories: state.categories,
							})
						}
					>
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
