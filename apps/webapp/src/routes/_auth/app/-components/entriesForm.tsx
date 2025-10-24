import { categories, SERVICE_START_DATE } from "@repo/shared-config"
import { useForm } from "@tanstack/react-form"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ChevronDownIcon } from "lucide-react"
import { useId, useState } from "react"
import { CategoryCombobox } from "@/components/combobox/CategoryCombobox"
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox"
import { EntryTypeCombobox } from "@/components/combobox/EntryTypeCombobox"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { type CreateEntryInput, createEntry } from "@/core/functions/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import { cn } from "@/lib/utils"

export function EntriesForm() {
	const executedAtId = useId()
	const amountId = useId()
	const descriptionId = useId()

	const queryClient = useQueryClient()
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})
	const [submittedOnce, setSubmittedOnce] = useState(false)
	type EntriesFormState = Omit<CreateEntryInput, "amount"> & {
		amount: number | ""
	}
	const defaultForm: EntriesFormState = {
		amount: "",
		currency: prefsQuery.data?.defaultEntryCurrency ?? "USD",
		category: categories[0],
		entryType: "Expense",
		description: "",
		executedAt: new Date(),
	}

	const form = useForm({
		defaultValues: defaultForm,
		onSubmit: async ({ value }) => {
			const amount =
				typeof value.amount === "string"
					? parseFloat(value.amount)
					: value.amount
			const payload: CreateEntryInput = {
				...value,
				amount,
			}
			await createEntry({ data: payload })
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
				queryClient.invalidateQueries({
					queryKey: ["monthlyEntriesForCharts"],
				}),
			])
		},
	})

	return (
		<Card>
			<CardHeader>
				<CardTitle>Add Entry</CardTitle>
			</CardHeader>
			<CardContent>
				<form
					className="space-y-4"
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						setSubmittedOnce(true)
						void form.handleSubmit()
					}}
				>
					<div className="grid grid-cols-[max-content_1fr] items-end gap-4 sm:grid-cols-[14rem_1fr]">
						<div className="grid gap-2">
							<Label>Type</Label>
							<form.Field name="entryType">
								{(field) => (
									<>
										<EntryTypeCombobox
											className="w-auto sm:w-full"
											onChange={(val) => field.handleChange(val)}
											value={field.state.value}
										/>
										{submittedOnce &&
											field.state.meta.errors.map((error) => (
												<div
													className="text-red-500 text-sm"
													key={String(error)}
												>
													{String(error)}
												</div>
											))}
									</>
								)}
							</form.Field>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={executedAtId}>Date</Label>
							<form.Field
								name="executedAt"
								validators={{
									onChange: ({ value }) => {
										if (
											!(value instanceof Date) ||
											Number.isNaN(value.getTime())
										) {
											return "Please select a valid date"
										}
										if (value < SERVICE_START_DATE) {
											return `Date cannot be earlier than ${SERVICE_START_DATE.toLocaleDateString()}`
										}
									},
								}}
							>
								{(field) => (
									<>
										<Popover>
											<PopoverTrigger asChild>
												<button
													className={cn(
														"border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:hover:bg-input/50 [&_svg:not([class*='text-'])]:text-muted-foreground",
														"flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap rounded-md border bg-transparent px-3 py-2 font-normal text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
													)}
													data-placeholder={
														field.state.value ? undefined : true
													}
													id={executedAtId}
													type="button"
												>
													{field.state.value
														? new Date(field.state.value).toLocaleDateString()
														: "Select date"}
													<ChevronDownIcon className="size-4 opacity-50" />
												</button>
											</PopoverTrigger>
											<PopoverContent
												align="start"
												className="w-auto overflow-hidden p-0"
											>
												<Calendar
													mode="single"
													onSelect={(date) => {
														if (!date) return
														field.handleChange(date)
													}}
													selected={
														field.state.value instanceof Date
															? field.state.value
															: undefined
													}
													startMonth={SERVICE_START_DATE}
												/>
											</PopoverContent>
										</Popover>
										{submittedOnce &&
											field.state.meta.errors.map((error) => (
												<div
													className="text-red-500 text-sm"
													key={String(error)}
												>
													{String(error)}
												</div>
											))}
									</>
								)}
							</form.Field>
						</div>
					</div>

					{/* Row 2: Currency, Amount */}
					<div className="grid grid-cols-[max-content_1fr] items-end gap-4 sm:grid-cols-[14rem_1fr]">
						<div className="grid gap-2">
							<Label>Currency</Label>
							<form.Field name="currency">
								{(field) => (
									<>
										<CurrencyCombobox
											className="w-auto sm:w-full"
											onChange={(val) => field.handleChange(val)}
											value={field.state.value}
										/>
										{submittedOnce &&
											field.state.meta.errors.map((error) => (
												<div
													className="text-red-500 text-sm"
													key={String(error)}
												>
													{String(error)}
												</div>
											))}
									</>
								)}
							</form.Field>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={amountId}>Amount</Label>
							<form.Field
								name="amount"
								validators={{
									onSubmit: ({ value }) =>
										typeof value !== "number" ||
										!Number.isFinite(value) ||
										value <= 0
											? "Amount must be greater than 0"
											: undefined,
								}}
							>
								{(field) => (
									<>
										<Input
											autoComplete="off"
											id={amountId}
											inputMode="decimal"
											onChange={(e) => {
												const raw = e.currentTarget.value
												if (raw === "") {
													field.handleChange("")
													return
												}
												const next = e.currentTarget.valueAsNumber
												field.handleChange(Number.isNaN(next) ? "" : next)
											}}
											placeholder="0.00"
											type="number"
											value={field.state.value === "" ? "" : field.state.value}
										/>
										{submittedOnce &&
											field.state.meta.errors.map((error) => (
												<div
													className="text-red-500 text-sm"
													key={String(error)}
												>
													{String(error)}
												</div>
											))}
									</>
								)}
							</form.Field>
						</div>
					</div>

					{/* Row 3: Category, Description */}
					<div className="grid grid-cols-[max-content_1fr] items-end gap-4 sm:grid-cols-[14rem_1fr]">
						<div className="grid gap-2">
							<Label>Category</Label>
							<form.Field name="category">
								{(field) => (
									<>
										<CategoryCombobox
											className="w-auto sm:w-full"
											onChange={(val) => field.handleChange(val)}
											value={field.state.value}
										/>
										{submittedOnce &&
											field.state.meta.errors.map((error) => (
												<div
													className="text-red-500 text-sm"
													key={String(error)}
												>
													{String(error)}
												</div>
											))}
									</>
								)}
							</form.Field>
						</div>
						<div className="grid gap-2">
							<Label htmlFor={descriptionId}>Description</Label>
							<form.Field name="description">
								{(field) => (
									<>
										<Input
											id={descriptionId}
											onChange={(e) =>
												field.handleChange(e.currentTarget.value)
											}
											placeholder="(Optional) Additional details"
											value={field.state.value ?? ""}
										/>
										{submittedOnce &&
											field.state.meta.errors.map((error) => (
												<div
													className="text-red-500 text-sm"
													key={String(error)}
												>
													{String(error)}
												</div>
											))}
									</>
								)}
							</form.Field>
						</div>
					</div>

					{/* Form-level errors could be rendered here if needed */}

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<div className="flex justify-end gap-2">
								<Button
									disabled={isSubmitting}
									onClick={() => form.reset()}
									type="reset"
									variant="ghost"
								>
									Reset
								</Button>
								<Button disabled={!canSubmit} type="submit">
									{isSubmitting ? "Saving..." : "Save"}
								</Button>
							</div>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	)
}
