import { currencyData } from "@repo/shared-lib"
import { useSuspenseQuery } from "@tanstack/react-query"
import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "../-functions/monthlyEntries"

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
				.reduce((acc, e) => acc + e.convertedAmount, 0),
		)
		const expenseTotal = Math.round(
			entries
				.filter((e) => e.entryType === "Expense")
				.reduce((acc, e) => acc + e.convertedAmount, 0),
		)
		const net = incomeTotal - expenseTotal
		return { incomeTotal, expenseTotal, net }
	}, [data])

	return (
		<div className="mt-2 flex flex-col items-end justify-center gap-2">
			<NumberLine
				color="text-[var(--amount-positive)]"
				sign="+"
				value={incomeTotal}
			/>
			<NumberLine
				color="text-[var(--amount-negative)]"
				sign="-"
				value={expenseTotal}
			/>
			<div className="my-2 h-0.5 w-full max-w-[260px] self-end bg-border" />
			<NumberLine
				color={
					net >= 0
						? "text-[var(--amount-positive)]"
						: "text-[var(--amount-negative)]"
				}
				sign={net >= 0 ? "+" : "-"}
				symbol={symbol}
				value={Math.abs(net)}
			/>
		</div>
	)
}

export function SummaryCard() {
	return (
		<Card>
			<CardHeader>
				<CardTitle>Summary</CardTitle>
			</CardHeader>
			<CardContent>
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
	sign: "+" | "-" | ""
	color: string
}) {
	return (
		<div className="flex w-full items-center justify-end gap-2 font-bold leading-none">
			{symbol ? (
				<span className="text-3xl text-muted-foreground md:text-4xl">
					{symbol}
				</span>
			) : null}
			<span className={`text-5xl tracking-tight md:text-6xl ${color}`}>
				{sign}
				{value.toLocaleString()}
			</span>
		</div>
	)
}
