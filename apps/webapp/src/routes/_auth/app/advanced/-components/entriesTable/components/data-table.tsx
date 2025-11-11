import type { Table as TanstackTable } from "@tanstack/react-table"
import { flexRender } from "@tanstack/react-table"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import type { MonthlyEntry } from "@/core/functions/entries"
import { cn } from "@/lib/utils"
import type { ColumnMeta } from "../index"

interface DataTableProps {
	table: TanstackTable<MonthlyEntry>
	isLoading: boolean
}

export function DataTable({ table, isLoading }: DataTableProps) {
	return (
		<div className="max-h-[600px] w-full overflow-x-auto overflow-y-auto overscroll-x-contain rounded-md border">
			{isLoading ? (
				<Table>
					<TableHeader className="sticky top-0 z-10">
						<TableRow className="bg-card">
							{table.getAllColumns().map((col, idx) => (
								<TableHead key={col.id ?? String(idx)}>
									<div className="h-4 w-24 animate-pulse rounded bg-muted" />
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{Array.from({ length: 8 }).map((_, r) => (
							<TableRow key={`skeleton-row-${String(r)}`}>
								{table.getAllColumns().map((_, c) => (
									<TableCell key={`skeleton-cell-${String(r)}-${String(c)}`}>
										<div className="h-4 w-full max-w-[200px] animate-pulse rounded bg-muted" />
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			) : (
				<Table>
					<TableHeader className="sticky top-0 z-10">
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow className="bg-card" key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									const align = (
										header.column.columnDef as { meta?: ColumnMeta }
									).meta?.align
									const thClass =
										align === "right"
											? "text-right"
											: align === "center"
												? "text-center"
												: "text-left"
									return (
										<TableHead className={thClass} key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef.header,
														header.getContext(),
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									data-state={row.getIsSelected() && "selected"}
									key={row.id}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell
											className={cn(
												(cell.column.columnDef as { meta?: ColumnMeta }).meta
													?.align === "right"
													? "text-right"
													: (cell.column.columnDef as { meta?: ColumnMeta })
																.meta?.align === "center"
														? "text-center"
														: undefined,
											)}
											key={cell.id}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									className="h-24 text-center"
									colSpan={table.getVisibleLeafColumns().length}
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			)}
		</div>
	)
}
