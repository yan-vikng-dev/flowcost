import { currencyData } from "@repo/shared-lib"
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query"
import { DateTime } from "luxon"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { type CreateEntryInput, createEntry } from "@/core/functions/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import {
	type CreateRecurringTemplateInput,
	createRecurringTemplate,
} from "@/core/functions/recurring-templates"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "../-functions/monthlyEntries"
import { EntryDialog, getDefaultEntryInitial } from "./EntryDialog"
import { buildRRuleFromUi } from "./RecurringCard/utils"

function SummaryContent() {
	const { data } = useSuspenseQuery({
		queryKey: MONTHLY_ENTRIES_KEY,
		queryFn: () => getMonthlyEntries(),
	})

	const displayCurrency = data.displayCurrency ?? "USD"
	const symbol = currencyData[displayCurrency]?.symbol ?? ""

	const { incomeTotal, expenseTotal, net } = React.useMemo(() => {
		const entries = data.entries ?? []
		const incomeTotal = Math.round(
			entries
				.filter((e) => e.entryType === "Income")
				.reduce((acc, e) => acc + (e.amountIls ?? 0), 0),
		)
		const expenseTotal = Math.round(
			entries
				.filter((e) => e.entryType === "Expense")
				.reduce((acc, e) => acc + (e.amountIls ?? 0), 0),
		)
		const net = incomeTotal - expenseTotal
		return { incomeTotal, expenseTotal, net }
	}, [data])

	const isEmpty = (data.entries?.length ?? 0) === 0

	if (isEmpty) {
		return (
			<div className="mx-auto grid h-[160px] w-full place-items-center text-muted-foreground text-sm">
				No entries this month
			</div>
		)
	}

	return (
		<div className="mt-2 flex flex-col items-end justify-center gap-2">
			<NumberLine color="text-emerald-500" sign="+" value={incomeTotal} />
			<NumberLine color="text-red-500" sign="-" value={expenseTotal} />
			<div className="my-2 h-0.5 w-full max-w-[260px] self-end bg-border" />
			<NumberLine
				color={net >= 0 ? "text-emerald-500" : "text-red-500"}
				sign={net >= 0 ? "+" : "-"}
				symbol={symbol}
				value={Math.abs(net)}
			/>
		</div>
	)
}

function EntryDialogWrapper({
	open,
	setOpen,
	createMut,
	createRecurringMut,
}: {
	open: boolean
	setOpen: (open: boolean) => void
	createMut: {
		mutate: (vars: CreateEntryInput) => void
		isPending: boolean
	}
	createRecurringMut: {
		mutate: (vars: CreateRecurringTemplateInput) => void
		isPending: boolean
	}
}) {
	const prefsQuery = useSuspenseQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	return (
		<EntryDialog
			initial={getDefaultEntryInitial({
				defaultCurrency: prefsQuery.data.defaultEntryCurrency ?? "USD",
			})}
			onOpenChange={setOpen}
			onSubmit={(state) => {
				const amount = typeof state.amount === "number" ? state.amount : 0
				createMut.mutate({
					amount,
					currency: state.currency,
					category: state.category,
					entryType: state.entryType,
					description: state.description,
					executedAt: state.executedAt,
				})
				setOpen(false)
			}}
			onSubmitRecurring={(state) => {
				if (
					!state.recurrence ||
					!state.executedAt ||
					!state.recurrence.unit ||
					!state.recurrence.every
				)
					return
				const amount = typeof state.amount === "number" ? state.amount : 0
				const rrule = buildRRuleFromUi(
					state.executedAt,
					state.recurrence,
					prefsQuery.data.timezone || "UTC",
				)
				createRecurringMut.mutate({
					amount,
					currency: state.currency,
					category: state.category,
					entryType: state.entryType,
					description: state.description,
					rrule,
					dtstart: state.executedAt,
					endAt: state.endAt,
				})
				setOpen(false)
			}}
			open={open}
			submitLabel={
				createMut.isPending || createRecurringMut.isPending
					? "Creating..."
					: "Create"
			}
			title="New Entry"
		/>
	)
}

export function MonthlyStandardSummary() {
	const queryClient = useQueryClient()
	const createMut = useMutation({
		mutationFn: (input: CreateEntryInput) => createEntry({ data: input }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["entries"] })
		},
	})
	const createRecurringMut = useMutation({
		mutationFn: (input: CreateRecurringTemplateInput) =>
			createRecurringTemplate({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
				queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] }),
			])
		},
	})

	const [open, setOpen] = React.useState(false)

	return (
		<Card variant="glass">
			<CardHeader>
				<CardTitle>Summary</CardTitle>
				<CardDescription>
					{DateTime.now().toFormat("LLLL yyyy")}
				</CardDescription>
				<CardAction>
					<Button onClick={() => setOpen(true)} size="sm" variant="default">
						New Entry
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent className="flex-1">
				<React.Suspense
					fallback={
						<div className="mt-2 flex flex-col items-end justify-center gap-2">
							<Skeleton className="h-12 w-32" />
							<Skeleton className="h-12 w-32" />
							<div className="my-2 h-0.5 w-full max-w-[260px] self-end bg-border" />
							<Skeleton className="h-12 w-32" />
						</div>
					}
				>
					<SummaryContent />
				</React.Suspense>
			</CardContent>
			<React.Suspense fallback={null}>
				<EntryDialogWrapper
					createMut={createMut}
					createRecurringMut={createRecurringMut}
					open={open}
					setOpen={setOpen}
				/>
			</React.Suspense>
		</Card>
	)
}

function NumberLine({
	value,
	symbol,
	sign = "",
	color = "",
}: {
	value: number
	symbol?: string
	sign?: "+" | "-" | ""
	color?: string
}) {
	return (
		<div
			className={`flex w-full items-baseline justify-end gap-2 font-bold leading-none ${color}`}
		>
			{symbol ? (
				<span className="text-3xl text-muted-foreground md:text-4xl">
					{symbol}
				</span>
			) : null}
			<span className="text-5xl tracking-tight md:text-6xl">
				{sign}
				{value.toLocaleString()}
			</span>
		</div>
	)
}
