import { formatCurrency } from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	type ChartConfig,
	ChartContainer,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart"
import {
	getMonthlyEntriesForCharts,
	MONTHLY_ENTRIES_FOR_CHARTS_KEY,
} from "../-functions/monthlyEntries"

type ChartSlice = {
	category: string
	amount: number
	formattedAmount: string
	fill: string
}

export function ExpensesByCategoryBar() {
	const { data } = useQuery({
		queryKey: MONTHLY_ENTRIES_FOR_CHARTS_KEY,
		queryFn: () => getMonthlyEntriesForCharts(),
	})

	const { chartData, total } = React.useMemo(() => {
		const displayCurrency = data?.displayCurrency ?? "USD"
		const expenses = (data?.entries ?? []).filter(
			(e) => e.entryType === "Expense",
		)
		const aggregated = expenses.reduce(
			(acc, e) => {
				const category = e.category.trim()
				const amount = Math.round(e.amountConverted)
				acc[category] = (acc[category] ?? 0) + amount
				return acc
			},
			{} as Record<string, number>,
		)
		const base = Object.entries(aggregated)
			.map(([category, amount]) => ({ category, amount }))
			.sort((a, b) => b.amount - a.amount)
		const top = base.slice(0, 4)
		const rest = base.slice(4)
		const restSum = rest.reduce((acc, it) => acc + it.amount, 0)
		const display =
			restSum > 0
				? [...top, { category: "Everything else", amount: restSum }]
				: top
		const chartData: ChartSlice[] = display.map((item, i) => ({
			category: item.category,
			amount: item.amount,
			formattedAmount: formatCurrency(item.amount, displayCurrency),
			fill: `var(--chart-${(i % 5) + 1})`,
		}))
		const total = chartData.reduce((acc, s) => acc + s.amount, 0)
		return { chartData, total }
	}, [data])

	const chartConfig = React.useMemo(() => {
		const cfg: ChartConfig = {
			amount: { label: "Amount", color: "var(--chart-1)" },
			label: { color: "var(--background)" },
		}
		return cfg
	}, [])

	const isEmpty = total <= 0
	const BAR_SIZE = 32
	const BAR_SPACING = 8
	const TOP_MARGIN = 24
	const BOTTOM_MARGIN = 12
	const CHART_MARGIN = {
		top: TOP_MARGIN,
		right: 48,
		bottom: BOTTOM_MARGIN,
		left: 0,
	} as const

	const chartHeight = React.useMemo(() => {
		if (chartData.length === 0) return 0
		return (
			chartData.length * (BAR_SIZE + BAR_SPACING) + TOP_MARGIN + BOTTOM_MARGIN
		)
	}, [chartData.length])

	if (isEmpty) return null

	return (
		<Card>
			<CardHeader className="items-center pb-0">
				<CardTitle>Expenses</CardTitle>
				<CardDescription>{data?.monthLabel ?? "This month"}</CardDescription>
			</CardHeader>
			<CardContent className="min-w-0 flex-1 pb-0">
				<ChartContainer
					className="w-full min-w-0 overflow-visible"
					config={chartConfig}
					style={{ height: chartHeight }}
				>
					<BarChart
						accessibilityLayer
						data={chartData}
						layout="vertical"
						margin={CHART_MARGIN}
					>
						<XAxis dataKey="amount" hide type="number" />
						<YAxis
							axisLine={false}
							dataKey="category"
							tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
							tickLine={false}
							type="category"
							width={60}
						/>
						<ChartTooltip
							content={
								<ChartTooltipContent
									formatter={(_value, _name, item) => {
										const entry = item.payload as ChartSlice
										return entry.formattedAmount
									}}
									hideLabel
								/>
							}
							cursor={false}
						/>
						<Bar
							barSize={BAR_SIZE}
							dataKey="amount"
							fill="var(--color-amount)"
							radius={4}
						>
							{chartData.map((item) => (
								<Cell fill={item.fill} key={`cell-${item.category}`} />
							))}
							<LabelList
								className="fill-foreground"
								dataKey="formattedAmount"
								fontSize={12}
								offset={4}
								position="right"
							/>
						</Bar>
					</BarChart>
				</ChartContainer>
			</CardContent>
		</Card>
	)
}
