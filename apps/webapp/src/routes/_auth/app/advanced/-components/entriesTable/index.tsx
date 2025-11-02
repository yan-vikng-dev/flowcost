import { useQuery } from "@tanstack/react-query"
import type { PaginationState, SortingState } from "@tanstack/react-table"
import * as React from "react"
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "@/routes/_auth/app/-functions/monthlyEntries"
import { DataTable } from "./data-table"
import { entriesTableColumns } from "./entries-table-columns"

export function MonthlyEntriesTable({
	headerAction,
}: {
	headerAction?: React.ReactNode
}) {
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	})
	const [sorting, setSorting] = React.useState<SortingState>([
		{ id: "executedAt", desc: true },
	])

	const { data, isLoading, isError } = useQuery({
		queryKey: MONTHLY_ENTRIES_KEY,
		queryFn: () => getMonthlyEntries(),
	})

	const displayCurrency = data?.displayCurrency ?? "USD"

	const sortedAndPaginated = React.useMemo(() => {
		if (!data) return { items: [], total: 0 }

		const sorted = [...data.entries].sort((a, b) => {
			const sortId = sorting[0]?.id ?? "executedAt"
			const desc = sorting[0]?.desc ?? true

			let comparison = 0
			if (sortId === "executedAt") {
				comparison =
					new Date(a.executedAt ?? a.executedDate).getTime() -
					new Date(b.executedAt ?? b.executedDate).getTime()
			} else if (sortId === "amount") {
				comparison = (a.amountIls ?? 0) - (b.amountIls ?? 0)
			} else if (sortId === "category") {
				comparison = a.category.localeCompare(b.category)
			} else if (sortId === "entryType") {
				comparison = a.entryType.localeCompare(b.entryType)
			}

			return desc ? -comparison : comparison
		})

		const start = pagination.pageIndex * pagination.pageSize
		const end = start + pagination.pageSize
		const items = sorted.slice(start, end)

		return { items, total: sorted.length }
	}, [data, sorting, pagination])

	return (
		<Card>
			<CardHeader>
				<CardTitle>This Month&apos;s Entries</CardTitle>
				{headerAction ? <CardAction>{headerAction}</CardAction> : null}
			</CardHeader>
			<CardContent>
				{isError ? (
					<div className="text-red-500 text-sm">Failed to load entries.</div>
				) : (
					<DataTable
						columns={entriesTableColumns(displayCurrency)}
						data={sortedAndPaginated.items}
						isFetching={false}
						isLoading={isLoading}
						manualPagination
						manualSorting
						onPaginationChange={setPagination}
						onSortingChange={setSorting}
						pageCount={Math.max(
							1,
							Math.ceil(sortedAndPaginated.total / pagination.pageSize),
						)}
						pagination={pagination}
						sorting={sorting}
					/>
				)}
			</CardContent>
		</Card>
	)
}
