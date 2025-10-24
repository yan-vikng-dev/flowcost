import { currencyData } from "@repo/shared-config"
import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { Label, Pie, PieChart } from "recharts"
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
	ChartLegend,
	ChartLegendContent,
	ChartTooltip,
	ChartTooltipContent,
} from "@/components/ui/chart"
import { getMonthlyEntriesForCharts } from "../-functions/monthlyEntries"

type ChartSlice = { category: string; amount: number; fill: string }

export function IncomeByCategoryDonut() {
	const { data } = useQuery({
		queryKey: ["monthlyEntriesForCharts"],
		queryFn: () => getMonthlyEntriesForCharts(),
	})

	const displayCurrency = data?.displayCurrency ?? "USD"
	const symbol = currencyData[displayCurrency]?.symbol ?? ""

	const { chartData, total } = React.useMemo(() => {
		const base = (data?.entries ?? [])
			.filter((e) => e.entryType === "Income")
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
			amount: { label: "Amount" },
		}
		for (const item of chartData) {
			const key = item.category
			if (!cfg[key]) cfg[key] = { label: key }
		}
		return cfg
	}, [chartData])

	const INNER_RADIUS = 72
	const LABEL_H_GAP = 16
	const isEmpty = total <= 0
	const CHART_MARGIN = { top: 16, right: 24, bottom: 16, left: 24 } as const

	return (
		<Card className="flex flex-col">
			<CardHeader className="items-center pb-0">
				<CardTitle>Income</CardTitle>
				<CardDescription>{data?.monthLabel ?? "This month"}</CardDescription>
			</CardHeader>
			<CardContent className="flex-1 pb-0">
				{isEmpty ? (
					<div className="mx-auto grid h-[300px] w-full place-items-center">
						<div className="text-center text-sm">
							<div className="mx-auto mb-3 grid h-24 w-24 place-items-center rounded-full border-2 border-muted border-dashed">
								<div className="text-muted-foreground">No data</div>
							</div>
							<div className="text-muted-foreground">No income this month</div>
							<div className="text-muted-foreground">
								Add income to see the breakdown
							</div>
						</div>
					</div>
				) : (
					<ChartContainer
						className="mx-auto aspect-square max-h-[300px] overflow-visible [&_.recharts-pie-label-text]:fill-foreground"
						config={chartConfig}
					>
						<PieChart margin={CHART_MARGIN}>
							<ChartTooltip
								content={<ChartTooltipContent hideLabel />}
								cursor={false}
							/>
							<Pie
								data={chartData}
								dataKey="amount"
								innerRadius={INNER_RADIUS}
								nameKey="category"
								strokeWidth={5}
							>
								<Label
									content={({ viewBox }) => {
										if (viewBox && "cx" in viewBox && "cy" in viewBox) {
											const vb = viewBox as { cx: number; cy: number }
											return (
												<CenterLabel
													cx={vb.cx ?? 0}
													cy={vb.cy ?? 0}
													hPad={LABEL_H_GAP}
													innerRadius={INNER_RADIUS}
													signPrefix="+"
													subtitle="Income"
													symbol={symbol}
													total={total}
												/>
											)
										}
									}}
								/>
							</Pie>
							<ChartLegend
								align="center"
								content={<ChartLegendContent nameKey="category" />}
								// Match PieChart margins so legend centers to chart area
								verticalAlign="bottom"
								wrapperStyle={{
									left: CHART_MARGIN.left,
									right: CHART_MARGIN.right,
								}}
							/>
						</PieChart>
					</ChartContainer>
				)}
			</CardContent>
		</Card>
	)
}

function CenterLabel({
	cx,
	cy,
	symbol,
	total,
	innerRadius,
	hPad = 16,
	signPrefix = "",
	subtitle = "Income",
}: {
	cx: number
	cy: number
	symbol: string
	total: number
	innerRadius: number
	hPad?: number
	signPrefix?: string
	subtitle?: string
}) {
	const groupRef = React.useRef<SVGGElement | null>(null)
	const [scale, setScale] = React.useState(1)

	React.useLayoutEffect(() => {
		const node = groupRef.current
		if (!node) return
		try {
			const bbox = node.getBBox()
			const allowed = Math.max(24, innerRadius * 2 - hPad * 2)
			const nextScale = bbox.width > 0 ? Math.min(1, allowed / bbox.width) : 1
			setScale(nextScale)
		} catch {}
	}, [innerRadius, hPad])

	return (
		<g transform={`translate(${cx}, ${cy})`}>
			<g ref={groupRef} transform={`scale(${scale})`}>
				<text dominantBaseline="middle" textAnchor="middle">
					<tspan className="fill-foreground font-bold">
						<tspan className="font-bold text-3xl md:text-4xl">
							{signPrefix}
							{total.toLocaleString()}
						</tspan>
						<tspan className="align-baseline text-xl"> {symbol}</tspan>
					</tspan>
					<tspan className="fill-muted-foreground" dy={24} x={0}>
						{subtitle}
					</tspan>
				</text>
			</g>
		</g>
	)
}
