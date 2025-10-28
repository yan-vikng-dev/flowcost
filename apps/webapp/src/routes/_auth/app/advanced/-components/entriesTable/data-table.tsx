import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
	type ColumnDef,
	type ColumnFiltersState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type OnChangeFn,
	type PaginationState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table"
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Copy,
	MoreHorizontal,
	Trash,
} from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { deleteEntries } from "@/core/functions/entries"
import { cn } from "@/lib/utils"

type RowWithId = { id?: string }
type ColumnMeta = { align?: "left" | "right" | "center" }

interface DataTableProps<TData extends RowWithId, TValue> {
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	manualPagination?: boolean
	pageCount?: number
	pagination?: PaginationState
	onPaginationChange?: OnChangeFn<PaginationState>
	manualSorting?: boolean
	sorting?: SortingState
	onSortingChange?: OnChangeFn<SortingState>
	isLoading?: boolean // initial load
	isFetching?: boolean // background refetch
}

export function DataTable<TData extends RowWithId, TValue>({
	columns,
	data,
	manualPagination = false,
	pageCount,
	pagination,
	onPaginationChange,
	manualSorting = false,
	sorting: controlledSorting,
	onSortingChange,
	isLoading = false,
	isFetching = false,
}: DataTableProps<TData, TValue>) {
	const [uncontrolledSorting, setUncontrolledSorting] =
		React.useState<SortingState>([])
	const sorting = controlledSorting ?? uncontrolledSorting
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	)
	const [rowSelection, setRowSelection] = React.useState({})
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({})

	const queryClient = useQueryClient()
	const deleteMut = useMutation({
		mutationFn: (ids: string[]) => deleteEntries({ data: { ids } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
				queryClient.invalidateQueries({
					queryKey: ["monthlyEntriesForCharts"],
				}),
			])
		},
	})

	const [confirmOpen, setConfirmOpen] = React.useState(false)
	const [confirmIds, setConfirmIds] = React.useState<string[]>([])

	// Selection column and actions column
	const selectionColumn = React.useMemo<ColumnDef<TData>>(
		(): ColumnDef<TData> => ({
			id: "select",
			header: ({ table }) => {
				const isAllSelected = table.getIsAllPageRowsSelected()
				const isSomeSelected = table.getIsSomePageRowsSelected()
				return (
					<IndeterminateCheckbox
						aria-label="Select all"
						checked={isAllSelected}
						indeterminate={!isAllSelected && isSomeSelected}
						onChange={(e) =>
							table.toggleAllPageRowsSelected(e.currentTarget.checked)
						}
					/>
				)
			},
			cell: ({ row }) => (
				<IndeterminateCheckbox
					aria-label="Select row"
					checked={row.getIsSelected()}
					onChange={(e) => row.toggleSelected(e.currentTarget.checked)}
				/>
			),
			enableSorting: false,
			enableHiding: false,
			size: 32,
		}),
		[],
	)

	const actionsColumn = React.useMemo<ColumnDef<TData>>(
		(): ColumnDef<TData> => ({
			id: "actions",
			enableHiding: false,
			cell: ({ row }) => {
				const id: string | undefined = row.original.id
				return (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="h-8 w-8 p-0" size="icon-sm" variant="ghost">
								<span className="sr-only">Open menu</span>
								<MoreHorizontal />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onClick={() => {
									if (!id) return
									void navigator.clipboard.writeText(id).then(() => {
										toast.success("Copied entry ID")
									})
								}}
							>
								<Copy className="mr-2 h-4 w-4" /> Copy ID
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => {
									if (!id) return
									setConfirmIds([id])
									setConfirmOpen(true)
								}}
								variant="destructive"
							>
								<Trash className="mr-2 h-4 w-4" /> Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)
			},
		}),
		[],
	)

	const enhancedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
		return [selectionColumn, ...columns, actionsColumn]
	}, [columns, selectionColumn, actionsColumn])

	const table = useReactTable({
		data,
		columns: enhancedColumns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: onSortingChange ?? setUncontrolledSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		manualPagination,
		manualSorting,
		pageCount,
		onPaginationChange,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			...(pagination ? { pagination } : {}),
		},
	})

	// Helper to compute pagination items with ellipses
	const paginationItems = React.useMemo(() => {
		const total = table.getPageCount()
		const current = table.getState().pagination.pageIndex + 1 // 1-based for UI
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
		// De-duplicate in case of overlaps
		return items.filter((v, i, arr) => i === 0 || v !== arr[i - 1])
	}, [table])

	return (
		<div>
			{/* Top loading bar for background fetches */}
			{isFetching && !isLoading ? (
				<div className="fixed top-0 right-0 left-0 z-30">
					<div className="h-0.5 w-full overflow-hidden bg-muted">
						<div className="h-0.5 w-1/3 animate-pulse bg-primary" />
					</div>
				</div>
			) : null}
			<div className="flex items-center gap-2 py-4">
				{table.getFilteredSelectedRowModel().rows.length > 0 && (
					<>
						<Button
							onClick={() => {
								const ids = table
									.getFilteredSelectedRowModel()
									.rows.map((r) => (r.original as RowWithId).id)
									.filter(Boolean) as string[]
								if (ids.length === 0) return
								setConfirmIds(ids)
								setConfirmOpen(true)
							}}
							size="sm"
							variant="destructive"
						>
							<Trash className="h-4 w-4" /> Delete selected
						</Button>
						<Button
							onClick={() => {
								const ids = table
									.getFilteredSelectedRowModel()
									.rows.map((r) => (r.original as RowWithId).id)
									.filter(Boolean) as string[]
								if (ids.length === 0) return
								void navigator.clipboard.writeText(ids.join("\n")).then(() => {
									toast.success(`Copied ${ids.length} id(s)`)
								})
							}}
							size="sm"
							variant="outline"
						>
							<Copy className="h-4 w-4" /> Copy selected
						</Button>
					</>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="ml-auto" variant="outline">
							Columns <ChevronDown className="ml-2 h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{table
							.getAllColumns()
							.filter((column) => column.getCanHide())
							.map((column) => (
								<DropdownMenuCheckboxItem
									checked={column.getIsVisible()}
									className="capitalize"
									key={column.id}
									onCheckedChange={(value) => column.toggleVisibility(!!value)}
								>
									{column.id}
								</DropdownMenuCheckboxItem>
							))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="w-full overflow-x-auto overscroll-x-contain rounded-md border">
				{isLoading ? (
					<Table>
						<TableHeader>
							<TableRow>
								{enhancedColumns.map((col, idx) => (
									<TableHead key={String((col as { id?: string }).id ?? idx)}>
										<div className="h-4 w-24 animate-pulse rounded bg-muted" />
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{Array.from({ length: 8 }).map((_, r) => (
								<TableRow key={`skeleton-row-${String(r)}`}>
									{enhancedColumns.map((_, c) => (
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
						<TableHeader>
							{table.getHeaderGroups().map((headerGroup) => (
								<TableRow key={headerGroup.id}>
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
						const isActive = table.getState().pagination.pageIndex === page - 1
						return (
							<Button
								aria-current={isActive ? "page" : undefined}
								key={page}
								onClick={() => table.setPageIndex(page - 1)}
								size="sm"
								variant={isActive ? "primary" : "outline"}
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
							table.setPageSize(Number(v))
							table.setPageIndex(0)
						}}
						value={String(table.getState().pagination.pageSize)}
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

			<Dialog onOpenChange={setConfirmOpen} open={confirmOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{confirmIds.length > 1
								? `Delete ${confirmIds.length} entries?`
								: "Delete entry?"}
						</DialogTitle>
						<DialogDescription>This action cannot be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button onClick={() => setConfirmOpen(false)} variant="ghost">
							Cancel
						</Button>
						<Button
							onClick={() => {
								void (async () => {
									try {
										if (confirmIds.length === 0) return
										await deleteMut.mutateAsync(confirmIds)
										toast.success(
											confirmIds.length > 1
												? `Deleted ${confirmIds.length} entries`
												: "Deleted 1 entry",
										)
										setConfirmOpen(false)
										setConfirmIds([])
										table.resetRowSelection()
									} catch {
										toast.error("Failed to delete entries")
									}
								})()
							}}
							variant="destructive"
						>
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

// Minimal indeterminate checkbox without Radix dependency
function IndeterminateCheckbox(
	props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
		indeterminate?: boolean
	},
) {
	const { indeterminate, className, ...rest } = props
	const ref = React.useRef<HTMLInputElement>(null)
	React.useEffect(() => {
		if (ref.current) {
			ref.current.indeterminate = Boolean(indeterminate)
		}
	}, [indeterminate])
	return (
		<input
			className={`h-4 w-4 cursor-pointer ${className ?? ""}`}
			ref={ref}
			type="checkbox"
			{...rest}
		/>
	)
}
