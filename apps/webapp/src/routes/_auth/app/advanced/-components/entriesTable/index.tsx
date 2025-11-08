import { getCurrentMonthRange } from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import {
	type ColumnDef,
	type ColumnFiltersState,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
	type VisibilityState,
} from "@tanstack/react-table"
import { Copy, MoreHorizontal, Trash } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MonthlyEntry } from "@/core/functions/entries"
import { fulltextFilter } from "@/core/functions/filters"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "@/routes/_auth/app/-functions/monthlyEntries"
import {
	DataTable,
	DeleteConfirmationDialog,
	TablePagination,
	TableToolbar,
} from "./components"
import { entriesTableColumns } from "./entries-table-columns"

export type RowWithId = { id?: string }
export type ColumnMeta = { align?: "left" | "right" | "center" }

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
		{ id: "executedDate", desc: true },
	])

	const { data, isLoading, isError } = useQuery({
		queryKey: MONTHLY_ENTRIES_KEY,
		queryFn: () => getMonthlyEntries(),
	})

	const displayCurrency = data?.displayCurrency ?? "USD"
	const timezone = data?.timezone ?? "UTC"
	const monthStart = React.useMemo(() => {
		return getCurrentMonthRange(timezone).start
	}, [timezone])

	const sortedAndPaginated = React.useMemo(() => {
		if (!data) return { items: [], total: 0 }

		const start = pagination.pageIndex * pagination.pageSize
		const end = start + pagination.pageSize
		const items = data.entries.slice(start, end)

		return { items, total: data.entries.length }
	}, [data, pagination])

	const isDesktop = useIsDesktop()
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	)
	const [rowSelection, setRowSelection] = React.useState({})
	const getDefaultColumnVisibility = (): VisibilityState => {
		if (isDesktop) {
			// Desktop: hide description and recurring by default
			return {
				description: false,
				recurring: false,
			}
		} else {
			// Mobile: show only date, category, converted
			return {
				recurring: false,
				description: false,
				amount: false,
				amountIls: true, // converted
				executedDate: true, // date
				category: true, // category
				globalFilter: false,
				actions: false,
			}
		}
	}

	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>(getDefaultColumnVisibility)

	// Update column visibility when screen size changes
	React.useEffect(() => {
		setColumnVisibility(
			isDesktop
				? {
						// Desktop: hide description and recurring by default
						description: false,
						recurring: false,
					}
				: {
						// Mobile: show only date, category, converted
						recurring: false,
						description: false,
						amount: false,
						amountIls: true, // converted
						executedDate: true, // date
						category: true, // category
						globalFilter: false,
						actions: false,
					},
		)
	}, [isDesktop])

	const [confirmOpen, setConfirmOpen] = React.useState(false)
	const [confirmIds, setConfirmIds] = React.useState<string[]>([])

	// Selection column and actions column
	const selectionColumn = React.useMemo<ColumnDef<MonthlyEntry>>(
		(): ColumnDef<MonthlyEntry> => ({
			id: "select",
			header: ({ table }) => {
				const isAllSelected = table.getIsAllPageRowsSelected()
				const isSomeSelected = table.getIsSomePageRowsSelected()
				return (
					<Checkbox
						aria-label="Select all"
						checked={
							isAllSelected ? true : isSomeSelected ? "indeterminate" : false
						}
						onCheckedChange={(checked) =>
							table.toggleAllPageRowsSelected(checked === true)
						}
					/>
				)
			},
			cell: ({ row }) => (
				<Checkbox
					aria-label="Select row"
					checked={row.getIsSelected()}
					onCheckedChange={(checked) => row.toggleSelected(checked === true)}
				/>
			),
			enableSorting: false,
			enableHiding: false,
			size: 32,
		}),
		[],
	)

	const actionsColumn = React.useMemo<ColumnDef<MonthlyEntry>>(
		(): ColumnDef<MonthlyEntry> => ({
			id: "actions",
			enableHiding: false,
			header: "",
			cell: ({ row }) => {
				const id = row.original.id
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

	const globalFilterColumn = React.useMemo<ColumnDef<MonthlyEntry>>(
		(): ColumnDef<MonthlyEntry> => ({
			id: "globalFilter",
			filterFn: fulltextFilter,
			enableHiding: true,
			enableSorting: false,
		}),
		[],
	)

	const enhancedColumns = React.useMemo<ColumnDef<MonthlyEntry>[]>(() => {
		return [
			selectionColumn,
			...entriesTableColumns({
				displayCurrency,
				monthStart,
			}),
			actionsColumn,
			globalFilterColumn,
		]
	}, [
		selectionColumn,
		displayCurrency,
		monthStart,
		actionsColumn,
		globalFilterColumn,
	])

	const table = useReactTable<MonthlyEntry>({
		data: data?.entries ?? [],
		columns: enhancedColumns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		manualPagination: true,
		pageCount: Math.max(
			1,
			Math.ceil(sortedAndPaginated.total / pagination.pageSize),
		),
		onPaginationChange: setPagination,
		globalFilterFn: fulltextFilter,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			pagination,
		},
	})

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
					<div>
						<TableToolbar
							setConfirmIds={setConfirmIds}
							setConfirmOpen={setConfirmOpen}
							table={table}
						/>

						<DataTable isLoading={isLoading} table={table} />

						<TablePagination table={table} />

						<DeleteConfirmationDialog
							confirmIds={confirmIds}
							onOpenChange={setConfirmOpen}
							open={confirmOpen}
							setConfirmIds={setConfirmIds}
							table={table}
						/>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
