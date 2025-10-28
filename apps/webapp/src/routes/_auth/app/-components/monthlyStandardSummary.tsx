import { currencyData } from "@repo/shared-config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { type CreateEntryInput, createEntry } from "@/core/functions/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import { getMonthlyEntriesForCharts } from "../-functions/monthlyEntries"
import { EntryDialog, getDefaultEntryInitial } from "./EntryDialog"

export function MonthlyStandardSummary() {
	const { data } = useQuery({
		queryKey: ["monthlyEntriesForCharts"],
		queryFn: () => getMonthlyEntriesForCharts(),
	})

	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const queryClient = useQueryClient()
	const createMut = useMutation({
		mutationFn: (input: CreateEntryInput) => createEntry({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
				queryClient.invalidateQueries({
					queryKey: ["monthlyEntriesForCharts"],
				}),
			])
		},
	})

	const [open, setOpen] = React.useState(false)

	const displayCurrency = data?.displayCurrency ?? "USD"
	const symbol = currencyData[displayCurrency]?.symbol ?? ""

	const { incomeTotal, expenseTotal, net } = React.useMemo(() => {
		const entries = data?.entries ?? []
		const incomeTotal = Math.round(
			entries
				.filter((e) => e.entryType === "Income")
				.reduce((acc, e) => acc + e.amountConverted, 0),
		)
		const expenseTotal = Math.round(
			entries
				.filter((e) => e.entryType === "Expense")
				.reduce((acc, e) => acc + e.amountConverted, 0),
		)
		const net = incomeTotal - expenseTotal
		return { incomeTotal, expenseTotal, net }
	}, [data])

	const isEmpty = (data?.entries?.length ?? 0) === 0

	return (
		<Card className="flex flex-col">
			<CardHeader>
				<CardTitle>Summary</CardTitle>
				<CardDescription>{data?.monthLabel ?? "This month"}</CardDescription>
				<CardAction>
					<Button onClick={() => setOpen(true)} size="sm" variant="primary">
						New Entry
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent className="flex-1">
				{isEmpty ? (
					<div className="mx-auto grid h-[160px] w-full place-items-center text-muted-foreground text-sm">
						No entries this month
					</div>
				) : (
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
				)}
			</CardContent>
			<EntryDialog
				initial={getDefaultEntryInitial({
					defaultCurrency: prefsQuery.data?.defaultEntryCurrency ?? "USD",
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
				open={open}
				submitLabel={createMut.isPending ? "Creating..." : "Create"}
				title="New Entry"
			/>
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
