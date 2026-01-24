import { parseRRULE } from "@repo/db/drizzle/queries"
import { type Category, type Currency, categories } from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import { CalendarIcon } from "lucide-react"
import * as React from "react"
import { CategoryCombobox } from "@/components/combobox/category-combobox"
import { CurrencyCombobox } from "@/components/combobox/currency-combobox"
import { EntryTypeSelect } from "@/components/combobox/entry-type-select"
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
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
	FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import type { CreateEntryInput } from "@/core/functions/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import {
	buildRRuleFromUi,
	getDefaultRecurrence,
	getWeekdayFromDate,
	type RecurrenceUi,
} from "./recurring-card/utils"

export type EntryFormState = Omit<CreateEntryInput, "amount"> & {
	amount: number | ""
	isRecurring?: boolean
	recurrence?: RecurrenceUi
	endAt?: Date
}

function normalizeAmountInput(input: string): string {
	const cleaned = input.replace(/[^0-9.]/g, "")
	const [integerPart = "", ...decimalParts] = cleaned.split(".")
	if (decimalParts.length === 0) return integerPart
	return `${integerPart}.${decimalParts.join("")}`
}

function formatAmountInputValue(value: number | ""): string {
	return value === "" ? "" : String(value)
}

function parseAmountInput(input: string): number | "" {
	if (input === "" || input === ".") return ""
	const parsed = Number.parseFloat(input)
	if (Number.isNaN(parsed)) return ""
	return parsed
}

export function EntryDialog({
	open,
	onOpenChange,
	initial,
	onSubmit,
	onSubmitRecurring,
	isPending = false,
}: {
	open: boolean
	onOpenChange: (isOpen: boolean) => void
	initial: EntryFormState
	onSubmit: (state: EntryFormState) => void
	onSubmitRecurring?: (state: EntryFormState) => void
	isPending?: boolean
}) {
	const [state, setState] = React.useState<EntryFormState>(initial)
	const [amountInput, setAmountInput] = React.useState(
		formatAmountInputValue(initial.amount),
	)
	const executedAtId = React.useId()
	const amountId = React.useId()
	const descriptionId = React.useId()
	const entryTypeId = React.useId()
	const currencyId = React.useId()
	const categoryId = React.useId()
	const recurringId = React.useId()
	const [datePopoverOpen, setDatePopoverOpen] = React.useState(false)
	const [endDatePopoverOpen, setEndDatePopoverOpen] = React.useState(false)

	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const timezone = prefsQuery.data?.timezone || "UTC"

	React.useEffect(() => {
		setState(initial)
		setAmountInput(formatAmountInputValue(initial.amount))
	}, [initial])

	const isRecurring = state.isRecurring ?? false

	const rrule = React.useMemo(() => {
		if (!isRecurring || !state.recurrence || !state.executedAt) return ""
		try {
			return buildRRuleFromUi(state.executedAt, state.recurrence, timezone)
		} catch {
			return ""
		}
	}, [isRecurring, state.recurrence, state.executedAt, timezone])

	const rruleSummary = React.useMemo(() => {
		if (!isRecurring || !rrule || !state.executedAt || !state.recurrence)
			return null
		try {
			const rule = parseRRULE(rrule, state.executedAt, state.endAt, timezone)
			const text = rule.toText()
			return text.charAt(0).toUpperCase() + text.slice(1)
		} catch {
			return null
		}
	}, [
		isRecurring,
		rrule,
		state.executedAt,
		state.recurrence,
		state.endAt,
		timezone,
	])

	const isRecurringValid =
		!isRecurring ||
		(rrule.length > 0 &&
			(state.recurrence?.unit !== "week" ||
				(state.recurrence?.weeklyDays?.length ?? 0) > 0))

	const valid =
		typeof state.amount === "number" &&
		state.amount > 0 &&
		state.currency !== undefined &&
		state.category !== undefined &&
		state.entryType !== undefined &&
		state.executedAt instanceof Date &&
		isRecurringValid

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>New Entry</DialogTitle>
					<DialogDescription>
						Add a new expense or income entry to track your finances.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-6">
					<FieldGroup>
						<FieldSet>
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
										onChange={(event) => {
											const normalizedValue = normalizeAmountInput(
												event.target.value,
											)
											setAmountInput(normalizedValue)
											setState((prev) => ({
												...prev,
												amount: parseAmountInput(normalizedValue),
											}))
										}}
										placeholder="0.00"
										value={amountInput}
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
									<EntryTypeSelect
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
												variant="outline"
											>
												<CalendarIcon className="mr-2 h-4 w-4" />
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
													setState((prev) => {
														const newDate = date ?? prev.executedAt
														if (
															prev.recurrence?.unit === "week" &&
															!prev.recurrence.weeklyDays?.length &&
															newDate
														) {
															const weekday = getWeekdayFromDate(newDate)
															return {
																...prev,
																executedAt: newDate,
																recurrence: {
																	...prev.recurrence,
																	weeklyDays: [weekday],
																},
															}
														}
														return {
															...prev,
															executedAt: newDate,
														}
													})
													setDatePopoverOpen(false)
												}}
												selected={state.executedAt}
											/>
										</PopoverContent>
									</Popover>
								</Field>

								<Field className="min-w-0" orientation="horizontal">
									<Switch
										checked={isRecurring}
										id={recurringId}
										onCheckedChange={(checked) => {
											setState((prev) => ({
												...prev,
												isRecurring: checked,
												recurrence: checked
													? prev.recurrence?.unit && prev.recurrence?.every
														? prev.recurrence
														: getDefaultRecurrence()
													: undefined,
											}))
										}}
									/>
									<FieldLabel htmlFor={recurringId}>Recurring</FieldLabel>
								</Field>
							</div>
						</FieldSet>

						{isRecurring && (
							<>
								<FieldSeparator />
								<FieldSet>
									<div className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-4">
										<Field className="min-w-0">
											<FieldLabel>Every</FieldLabel>
											<div className="flex gap-2">
												<Input
													className="w-20"
													inputMode="numeric"
													min={1}
													onChange={(event) => {
														const val = Number.parseInt(event.target.value, 10)
														if (!Number.isNaN(val) && val > 0) {
															setState((prev) => ({
																...prev,
																recurrence: {
																	...(prev.recurrence ?? {
																		every: 1,
																		unit: "month",
																		monthlyMode: { type: "byMonthDay" },
																	}),
																	every: val,
																},
															}))
														}
													}}
													type="number"
													value={state.recurrence?.every ?? 1}
												/>
												<Select
													onValueChange={(value: RecurrenceUi["unit"]) =>
														setState((prev) => {
															const baseRecurrence =
																prev.recurrence ?? getDefaultRecurrence()
															let weeklyDays: RecurrenceUi["weeklyDays"] =
																baseRecurrence.weeklyDays
															if (value === "week" && !weeklyDays?.length) {
																const dtstart = prev.executedAt ?? new Date()
																weeklyDays = [getWeekdayFromDate(dtstart)]
															}
															return {
																...prev,
																recurrence: {
																	...baseRecurrence,
																	unit: value,
																	monthlyMode:
																		value === "month"
																			? { type: "byMonthDay" }
																			: undefined,
																	weeklyDays,
																},
															}
														})
													}
													value={state.recurrence?.unit ?? "month"}
												>
													<SelectTrigger className="flex-1">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="day">
															{state.recurrence?.every === 1 ? "day" : "days"}
														</SelectItem>
														<SelectItem value="week">
															{state.recurrence?.every === 1 ? "week" : "weeks"}
														</SelectItem>
														<SelectItem value="month">
															{state.recurrence?.every === 1
																? "month"
																: "months"}
														</SelectItem>
														<SelectItem value="year">
															{state.recurrence?.every === 1 ? "year" : "years"}
														</SelectItem>
													</SelectContent>
												</Select>
											</div>
										</Field>

										<Field>
											<FieldLabel>Until</FieldLabel>
											<Popover
												onOpenChange={setEndDatePopoverOpen}
												open={endDatePopoverOpen}
											>
												<PopoverTrigger asChild>
													<Button className="w-full" variant="outline">
														<CalendarIcon className="mr-2 h-4 w-4" />
														{state.endAt
															? state.endAt.toLocaleDateString()
															: "Unlimited"}
													</Button>
												</PopoverTrigger>
												<PopoverContent
													align="start"
													className="w-auto overflow-hidden p-0"
												>
													<Calendar
														autoFocus
														disabled={(date) =>
															state.executedAt ? date < state.executedAt : false
														}
														mode="single"
														onSelect={(date) => {
															setState((prev) => ({
																...prev,
																endAt: date ?? undefined,
															}))
															setEndDatePopoverOpen(false)
														}}
														selected={state.endAt}
													/>
												</PopoverContent>
											</Popover>
										</Field>
									</div>
									{state.recurrence?.unit === "week" && (
										<Field>
											<FieldLabel>On</FieldLabel>
											<div className="flex flex-wrap gap-2">
												{(
													["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const
												).map((day) => {
													const isSelected =
														state.recurrence?.weeklyDays?.includes(day) ?? false
													return (
														<Button
															disabled={
																isSelected &&
																(state.recurrence?.weeklyDays?.length ?? 0) ===
																	1
															}
															key={day}
															onClick={() => {
																setState((prev) => {
																	const currentDays =
																		prev.recurrence?.weeklyDays ?? []
																	if (isSelected && currentDays.length === 1) {
																		return prev
																	}
																	const newDays = isSelected
																		? currentDays.filter((d) => d !== day)
																		: [...currentDays, day]
																	return {
																		...prev,
																		recurrence: {
																			...(prev.recurrence ?? {
																				...getDefaultRecurrence(),
																				unit: "week",
																			}),
																			weeklyDays: newDays,
																		},
																	}
																})
															}}
															size="sm"
															type="button"
															variant={isSelected ? "default" : "outline"}
														>
															{day}
														</Button>
													)
												})}
											</div>
										</Field>
									)}
									{rruleSummary && (
										<div className="text-muted-foreground text-sm">
											{rruleSummary}
										</div>
									)}
								</FieldSet>
							</>
						)}
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
						disabled={!valid || isPending}
						onClick={() => {
							if (!valid) return
							const amount = state.amount === "" ? 0 : state.amount
							if (isRecurring && onSubmitRecurring) {
								onSubmitRecurring({
									...state,
									amount,
								})
							} else {
								onSubmit({
									...state,
									amount,
								})
							}
						}}
					>
						{isPending ? "Creating..." : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export function getDefaultEntryInitial({
	defaultCurrency,
	isRecurring = false,
}: {
	defaultCurrency: Currency
	isRecurring?: boolean
}): EntryFormState {
	return {
		amount: "",
		currency: defaultCurrency,
		category: categories[0],
		entryType: "Expense",
		description: "",
		executedAt: new Date(),
		isRecurring,
		recurrence: isRecurring ? getDefaultRecurrence() : undefined,
		endAt: undefined,
	}
}
