import type { Table } from "@tanstack/react-table"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import type { MonthlyEntry } from "@/core/functions/entries"

interface TablePaginationProps {
	table: Table<MonthlyEntry>
}

export function TablePagination({ table }: TablePaginationProps) {
	const paginationState = table.getState().pagination
	const pageCount = table.getPageCount()

	const paginationItems = React.useMemo(() => {
		const total = pageCount
		const current = paginationState.pageIndex + 1
		const siblingCount = 1
		const boundaryCount = 1
		if (total <= 0) return [] as Array<number | "dots">

		const range = (start: number, end: number) => {
			const out: number[] = []
			for (let i = start; i <= end; i++) out.push(i)
			return out
		}

		const startPages = range(1, Math.min(boundaryCount, total))
		const endStart = Math.max(total - boundaryCount + 1, boundaryCount + 1)
		const endPages = range(endStart, total)

		const siblingsStart = Math.max(
			Math.min(
				current - siblingCount,
				total - boundaryCount - siblingCount * 2 - 1,
			),
			boundaryCount + 2,
		)
		const siblingsEnd = Math.min(
			Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
			Math.min(endStart - 2, total - 1),
		)

		const items: Array<number | "dots"> = []
		items.push(...startPages)
		if (siblingsStart > boundaryCount + 2) {
			items.push("dots")
		} else if (boundaryCount + 1 < total - boundaryCount) {
			items.push(boundaryCount + 1)
		}

		items.push(...range(siblingsStart, siblingsEnd))

		if (siblingsEnd < total - boundaryCount - 1) {
			items.push("dots")
		} else if (total - boundaryCount > boundaryCount) {
			items.push(total - boundaryCount)
		}

		items.push(...endPages)
		return items.filter((v, i, arr) => i === 0 || v !== arr[i - 1])
	}, [paginationState.pageIndex, pageCount])
	return (
		<div className="flex flex-wrap items-center justify-end gap-2 py-4">
			{/* Pagination controls */}
			<div className="flex items-center gap-1">
				<Button
					aria-label="Previous page"
					disabled={!table.getCanPreviousPage()}
					onClick={() => table.previousPage()}
					size="icon-sm"
					variant="outline"
				>
					<ChevronLeft />
				</Button>
				{paginationItems.map((item, idx) => {
					if (item === "dots") {
						return (
							<Button
								aria-hidden
								className="px-2"
								disabled
								key={`pagination-dots-${String(idx)}`}
								size="sm"
								variant="ghost"
							>
								…
							</Button>
						)
					}
					const page = item
					const isActive = paginationState.pageIndex === page - 1
					return (
						<Button
							aria-current={isActive ? "page" : undefined}
							key={page}
							onClick={() => table.setPageIndex(page - 1)}
							size="sm"
							variant={isActive ? "default" : "outline"}
						>
							{page}
						</Button>
					)
				})}
				<Button
					aria-label="Next page"
					disabled={!table.getCanNextPage()}
					onClick={() => table.nextPage()}
					size="icon-sm"
					variant="outline"
				>
					<ChevronRight />
				</Button>
			</div>

			{/* Rows per page selector */}
			<div className="ml-2 flex items-center gap-2">
				<span className="text-muted-foreground text-sm">Rows per page</span>
				<Select
					onValueChange={(v) => {
						table.setPagination({
							pageIndex: 0,
							pageSize: Number(v),
						})
					}}
					value={String(paginationState.pageSize)}
				>
					<SelectTrigger className="h-8 w-[100px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{[5, 10, 20, 50, 100].map((n) => (
							<SelectItem key={n} value={String(n)}>
								{n}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</div>
	)
}
