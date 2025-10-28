import { type Category, type Currency, categories } from "@repo/shared-config"
import * as React from "react"
import { CategoryCombobox } from "@/components/combobox/CategoryCombobox"
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox"
import { EntryTypeCombobox } from "@/components/combobox/EntryTypeCombobox"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { CreateEntryInput } from "@/core/functions/entries"

export type EntryFormState = Omit<CreateEntryInput, "amount"> & {
	amount: number | ""
}

function parseAmountInput(input: string, previous: number | ""): number | "" {
	const sanitized = input.replace(/[^0-9.]/g, "")
	if (sanitized.length === 0) return ""
	const parsed = Number.parseFloat(sanitized)
	if (Number.isNaN(parsed)) return previous
	return parsed
}

export function EntryDialog({
	open,
	onOpenChange,
	initial,
	onSubmit,
	title,
	submitLabel,
}: {
	open: boolean
	onOpenChange: (isOpen: boolean) => void
	initial: EntryFormState
	onSubmit: (state: EntryFormState) => void
	title: string
	submitLabel: string
}) {
	const [state, setState] = React.useState<EntryFormState>(initial)
	const executedAtId = React.useId()
	const amountId = React.useId()
	const descriptionId = React.useId()
	const entryTypeId = React.useId()
	const currencyId = React.useId()
	const categoryId = React.useId()
	const [datePopoverOpen, setDatePopoverOpen] = React.useState(false)

	React.useEffect(() => setState(initial), [initial])

	const valid =
		typeof state.amount === "number" &&
		state.amount > 0 &&
		state.description !== undefined &&
		state.currency !== undefined &&
		state.category !== undefined &&
		state.entryType !== undefined &&
		state.executedAt instanceof Date

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>Add an income or expense entry.</DialogDescription>
				</DialogHeader>
				<div className="space-y-6">
					<FieldGroup>
						<div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-4">
							<Field>
								<FieldLabel>Currency</FieldLabel>
								<CurrencyCombobox
									id={currencyId}
									onChange={(currency: Currency) =>
										setState((prev) => ({ ...prev, currency }))
									}
									value={state.currency}
								/>
							</Field>
							<Field className="min-w-0">
								<FieldLabel htmlFor={amountId}>Amount</FieldLabel>
								<Input
									id={amountId}
									inputMode="decimal"
									onChange={(event) =>
										setState((prev) => ({
											...prev,
											amount: parseAmountInput(event.target.value, prev.amount),
										}))
									}
									placeholder="0.00"
									value={state.amount}
								/>
							</Field>

							<Field>
								<FieldLabel>Category</FieldLabel>
								<CategoryCombobox
									id={categoryId}
									onChange={(category: Category) =>
										setState((prev) => ({ ...prev, category }))
									}
									value={state.category}
								/>
							</Field>
							<Field className="min-w-0">
								<FieldLabel htmlFor={descriptionId}>Description</FieldLabel>
								<Input
									id={descriptionId}
									onChange={(event) =>
										setState((prev) => ({
											...prev,
											description: event.target.value,
										}))
									}
									placeholder="Optional"
									value={state.description ?? ""}
								/>
							</Field>

							<Field>
								<FieldLabel htmlFor={entryTypeId}>Type</FieldLabel>
								<EntryTypeCombobox
									id={entryTypeId}
									onChange={(entryType) =>
										setState((prev) => ({ ...prev, entryType }))
									}
									value={state.entryType}
								/>
							</Field>
							<Field className="min-w-0">
								<FieldLabel htmlFor={executedAtId}>Date</FieldLabel>
								<Popover
									onOpenChange={setDatePopoverOpen}
									open={datePopoverOpen}
								>
									<PopoverTrigger asChild>
										<Button
											className="w-full"
											id={executedAtId}
											variant="input"
										>
											{state.executedAt.toLocaleDateString()}
										</Button>
									</PopoverTrigger>
									<PopoverContent
										align="start"
										className="w-auto overflow-hidden p-0"
									>
										<Calendar
											initialFocus
											mode="single"
											onSelect={(date) => {
												setState((prev) => ({
													...prev,
													executedAt: date ?? prev.executedAt,
												}))
												setDatePopoverOpen(false)
											}}
											selected={state.executedAt}
										/>
									</PopoverContent>
								</Popover>
							</Field>
						</div>
					</FieldGroup>
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
								...state,
								amount: state.amount === "" ? 0 : state.amount,
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

export function getDefaultEntryInitial({
	defaultCurrency,
}: {
	defaultCurrency: Currency
}): EntryFormState {
	return {
		amount: "",
		currency: defaultCurrency,
		category: categories[0],
		entryType: "Expense",
		description: "",
		executedAt: new Date(),
	}
}
