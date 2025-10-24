import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
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
import { getMonthlyEntriesForCharts } from "../-functions/monthlyEntries"

type ChartSlice = { category: string; amount: number; fill: string }

export function ExpensesByCategoryBar() {
	const { data } = useQuery({
		queryKey: ["monthlyEntriesForCharts"],
		queryFn: () => getMonthlyEntriesForCharts(),
	})

	const { chartData, total } = React.useMemo(() => {
		const base = (data?.entries ?? [])
			.filter((e) => e.entryType === "Expense")
			.map((e) => ({
				category: e.category,
				amount: Math.round(e.amountConverted),
			}))
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
	const CHART_MARGIN = { top: 24, right: 48, bottom: 12, left: 12 } as const

	return (
		<Card className="flex min-w-0 flex-col">
			<CardHeader className="items-center pb-0">
				<CardTitle>Expenses</CardTitle>
				<CardDescription>{data?.monthLabel ?? "This month"}</CardDescription>
			</CardHeader>
			<CardContent className="min-w-0 flex-1 pb-0">
				{isEmpty ? (
					<div className="mx-auto grid h-[300px] w-full place-items-center">
						<div className="text-center text-sm">
							<div className="text-muted-foreground">
								No expenses this month
							</div>
							<div className="text-muted-foreground">
								Add an expense to see the breakdown
							</div>
						</div>
					</div>
				) : (
					<ChartContainer
						className="min-h-[220px] w-full min-w-0 overflow-visible"
						config={chartConfig}
					>
						<BarChart
							accessibilityLayer
							data={chartData}
							layout="vertical"
							margin={CHART_MARGIN}
						>
							<XAxis dataKey="amount" hide type="number" />
							<YAxis dataKey="category" hide type="category" />
							<ChartTooltip
								content={<ChartTooltipContent hideLabel />}
								cursor={false}
							/>
							<Bar dataKey="amount" fill="var(--color-amount)" radius={4}>
								{chartData.map((item) => (
									<Cell fill={item.fill} key={`cell-${item.category}`} />
								))}
								<LabelList
									content={<CategoryBadgeLabel />}
									dataKey="category"
									position="insideLeft"
								/>
								<LabelList
									className="fill-foreground"
									dataKey="amount"
									fontSize={12}
									offset={4}
									position="right"
								/>
							</Bar>
						</BarChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
}

function CategoryBadgeLabel({
	x = 0,
	y = 0,
	width = 0,
	height = 0,
	value,
}: {
	x?: number
	y?: number
	width?: number
	height?: number
	value?: number | string
}) {
	if (value == null) return null

	const labelH = 30
	const pad = 4
	const fx = Math.max(0, x + pad)
	const fy = y + Math.max(0, (height - labelH) / 2)
	const fWidth = Math.max(24, width - pad * 2)
	const fHeight = labelH

	return (
		<foreignObject
			height={fHeight}
			style={{ pointerEvents: "none" }}
			width={fWidth}
			x={fx}
			y={fy}
		>
			<div
				style={{
					width: fWidth,
					height: fHeight,
					display: "flex",
					alignItems: "center",
				}}
			>
				<Badge className="max-w-full truncate" variant="secondary">
					{String(value)}
				</Badge>
			</div>
		</foreignObject>
	)
}
