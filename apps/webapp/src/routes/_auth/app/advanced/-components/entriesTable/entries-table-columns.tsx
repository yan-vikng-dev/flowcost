import type { EntryType } from "@repo/data-ops/drizzle/schemas/index"
import { type Currency, formatCurrency } from "@repo/shared-lib"
import type { ColumnDef } from "@tanstack/react-table"
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	FilterIcon,
	RepeatIcon,
} from "lucide-react"
import { NumericRangeSlider } from "@/components/table-filters"
import { Button } from "@/components/ui/button"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { getCategoryIcon } from "@/config/categories"
import { getEntryTypeIcon } from "@/config/entryTypes"
import type { MonthlyEntry } from "@/core/functions/entries"
import type {
	DateRangeFilter,
	NumberRangeFilter,
} from "@/core/functions/filters"
import {
	booleanFilter,
	dateRangeFilter,
	enumMultiSelectFilter,
	numberRangeFilter,
} from "@/core/functions/filters"
import { cn } from "@/lib/utils"
import { ColumnFilter } from "./column-filter"
import { DateRangePicker } from "./components"

interface EntriesTableColumnsOptions {
	displayCurrency: string
	showFilters?: boolean
	monthStart?: Date
}

function getColumnMaxValue(
	column: {
		getFacetedRowModel: () => { rows: { getValue: (id: string) => unknown }[] }
	},
	columnId: string,
): number {
	const rows = column.getFacetedRowModel().rows
	let maxValue = 0
	for (const row of rows) {
		const value = row.getValue(columnId)
		if (typeof value === "number" && value > maxValue) {
			maxValue = value
		}
	}
	return Math.max(1, Math.ceil(maxValue * 1.1))
}

export function entriesTableColumns({
	displayCurrency,
	showFilters = true,
	monthStart,
}: EntriesTableColumnsOptions): ColumnDef<MonthlyEntry>[] {
	return [
		{
			accessorKey: "recurring",
			filterFn: booleanFilter,
			meta: { align: "center" },
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				const hasSort = sorted !== false
				return (
					<div className="flex items-center gap-1">
						<span>Recurring</span>
						<Button
							className={cn(
								"h-6 w-6 shrink-0",
								hasSort && "bg-primary/10 text-primary hover:bg-primary/20",
							)}
							onClick={() => {
								if (sorted === "asc") {
									column.toggleSorting(true) // to desc
								} else if (sorted === "desc") {
									column.clearSorting() // to off
								} else {
									column.toggleSorting(false) // to asc
								}
							}}
							size="icon-sm"
							variant={hasSort ? "secondary" : "ghost"}
						>
							{sorted === "asc" ? (
								<ArrowUpIcon className="h-4 w-4" />
							) : sorted === "desc" ? (
								<ArrowDownIcon className="h-4 w-4" />
							) : (
								<ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
						{showFilters && <ColumnFilter column={column} />}
					</div>
				)
			},
			cell: ({ row }) => {
				const entry = row.original
				const isRecurring = Boolean(entry.recurringTemplateId)
				if (!isRecurring) return null
				return (
					<div className="flex items-center justify-center gap-1">
						<RepeatIcon className="h-4 w-4 text-muted-foreground" />
						{entry.isOverridden && (
							<span className="text-muted-foreground text-xs">
								(overridden)
							</span>
						)}
					</div>
				)
			},
			sortingFn: (a, b) => {
				const aRecurring = Boolean(a.original.recurringTemplateId)
				const bRecurring = Boolean(b.original.recurringTemplateId)
				return Number(aRecurring) - Number(bRecurring)
			},
		},
		{
			accessorKey: "executedDate",
			filterFn: dateRangeFilter,
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				const hasSort = sorted !== false
				const hasFilter = column.getIsFiltered()
				const filterValue = column.getFilterValue() as
					| DateRangeFilter
					| undefined

				return (
					<div className="flex items-center gap-1">
						<span>Date</span>
						<Button
							className={cn(
								"h-6 w-6 shrink-0",
								hasSort && "bg-primary/10 text-primary hover:bg-primary/20",
							)}
							onClick={() => {
								if (sorted === "asc") {
									column.toggleSorting(true) // to desc
								} else if (sorted === "desc") {
									column.clearSorting() // to off
								} else {
									column.toggleSorting(false) // to asc
								}
							}}
							size="icon-sm"
							variant={hasSort ? "secondary" : "ghost"}
						>
							{sorted === "asc" ? (
								<ArrowUpIcon className="h-4 w-4" />
							) : sorted === "desc" ? (
								<ArrowDownIcon className="h-4 w-4" />
							) : (
								<ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
						{showFilters && (
							<Popover>
								<PopoverTrigger asChild>
									<Button
										className={cn(
											"ml-1 h-6 w-6 shrink-0",
											hasFilter &&
												"bg-primary/10 text-primary hover:bg-primary/20",
										)}
										size="icon-sm"
										variant={hasFilter ? "secondary" : "ghost"}
									>
										<FilterIcon className="h-3 w-3" />
										<span className="sr-only">Filter executedDate</span>
									</Button>
								</PopoverTrigger>
								<PopoverContent align="start" className="w-auto p-0">
									<DateRangePicker
										monthStart={monthStart}
										onChange={(range: DateRangeFilter | undefined) =>
											column.setFilterValue(range)
										}
										value={filterValue}
									/>
								</PopoverContent>
							</Popover>
						)}
					</div>
				)
			},
			cell: ({ row }) => {
				const dateStr = row.original.executedDate
				const dt = new Date(`${dateStr}T00:00:00`)
				const day = String(dt.getDate()).padStart(2, "0")
				const month = String(dt.getMonth() + 1).padStart(2, "0")
				const year = String(dt.getFullYear()).slice(-2)
				return `${day}/${month}/${year}`
			},
			sortingFn: (a, b) =>
				a.original.executedDate.localeCompare(b.original.executedDate),
		},
		{
			accessorKey: "entryType",
			filterFn: enumMultiSelectFilter,
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				const hasSort = sorted !== false
				return (
					<div className="flex items-center gap-1">
						<span>Type</span>
						<Button
							className={cn(
								"h-6 w-6 shrink-0",
								hasSort && "bg-primary/10 text-primary hover:bg-primary/20",
							)}
							onClick={() => {
								if (sorted === "asc") {
									column.toggleSorting(true) // to desc
								} else if (sorted === "desc") {
									column.clearSorting() // to off
								} else {
									column.toggleSorting(false) // to asc
								}
							}}
							size="icon-sm"
							variant={hasSort ? "secondary" : "ghost"}
						>
							{sorted === "asc" ? (
								<ArrowUpIcon className="h-4 w-4" />
							) : sorted === "desc" ? (
								<ArrowDownIcon className="h-4 w-4" />
							) : (
								<ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
						{showFilters && <ColumnFilter column={column} />}
					</div>
				)
			},
			cell: ({ row }) => {
				const entryType = row.getValue<EntryType>("entryType")
				const Icon = getEntryTypeIcon(entryType)
				return (
					<span className="flex items-center gap-2">
						<span
							aria-hidden
							className="inline-flex w-5 shrink-0 justify-center leading-none sm:w-6"
						>
							<Icon className="size-4" />
						</span>
						<span>{entryType}</span>
					</span>
				)
			},
		},
		{
			accessorKey: "category",
			filterFn: enumMultiSelectFilter,
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				const hasSort = sorted !== false
				return (
					<div className="flex items-center gap-1">
						<span>Category</span>
						<Button
							className={cn(
								"h-6 w-6 shrink-0",
								hasSort && "bg-primary/10 text-primary hover:bg-primary/20",
							)}
							onClick={() => {
								if (sorted === "asc") {
									column.toggleSorting(true) // to desc
								} else if (sorted === "desc") {
									column.clearSorting() // to off
								} else {
									column.toggleSorting(false) // to asc
								}
							}}
							size="icon-sm"
							variant={hasSort ? "secondary" : "ghost"}
						>
							{sorted === "asc" ? (
								<ArrowUpIcon className="h-4 w-4" />
							) : sorted === "desc" ? (
								<ArrowDownIcon className="h-4 w-4" />
							) : (
								<ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
						{showFilters && <ColumnFilter column={column} />}
					</div>
				)
			},
			cell: ({ row }) => {
				const category = String(row.getValue("category"))
				const Icon = getCategoryIcon(category)
				return (
					<span className="flex items-center gap-2">
						<span
							aria-hidden
							className="inline-flex w-5 shrink-0 justify-center leading-none sm:w-6"
						>
							<Icon className="size-4" />
						</span>
						<span>{category}</span>
					</span>
				)
			},
		},
		{
			accessorKey: "description",
			enableSorting: false,
			header: "Description",
			cell: ({ row }) => String(row.getValue("description") ?? ""),
		},
		{
			accessorKey: "amount",
			filterFn: numberRangeFilter,
			meta: { align: "right" },
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				const hasSort = sorted !== false
				const hasFilter = column.getIsFiltered()
				const filterValue = column.getFilterValue() as
					| NumberRangeFilter
					| undefined
				const maxValue = getColumnMaxValue(column, "amount")

				return (
					<div className="flex items-center justify-end gap-1">
						<span>Amount</span>
						<Button
							className={cn(
								"h-6 w-6 shrink-0",
								hasSort && "bg-primary/10 text-primary hover:bg-primary/20",
							)}
							onClick={() => {
								if (sorted === "asc") {
									column.toggleSorting(true) // to desc
								} else if (sorted === "desc") {
									column.clearSorting() // to off
								} else {
									column.toggleSorting(false) // to asc
								}
							}}
							size="icon-sm"
							variant={hasSort ? "secondary" : "ghost"}
						>
							{sorted === "asc" ? (
								<ArrowUpIcon className="h-4 w-4" />
							) : sorted === "desc" ? (
								<ArrowDownIcon className="h-4 w-4" />
							) : (
								<ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
						{showFilters && (
							<Popover>
								<PopoverTrigger asChild>
									<Button
										className={cn(
											"ml-1 h-6 w-6 shrink-0",
											hasFilter &&
												"bg-primary/10 text-primary hover:bg-primary/20",
										)}
										size="icon-sm"
										variant={hasFilter ? "secondary" : "ghost"}
									>
										<FilterIcon className="h-3 w-3" />
										<span className="sr-only">Filter amount</span>
									</Button>
								</PopoverTrigger>
								<PopoverContent align="start" className="w-auto p-4">
									<div className="space-y-2">
										<h4 className="font-medium text-sm">Filter by amount</h4>
										<div className="min-w-80">
											<NumericRangeSlider
												max={maxValue}
												maxLabel="Max amount"
												min={0}
												minLabel="Min amount"
												onChange={(value: NumberRangeFilter | undefined) =>
													column.setFilterValue(value)
												}
												step={1}
												value={filterValue}
											/>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						)}
					</div>
				)
			},
			cell: ({ row }) => {
				const amount = Number(row.getValue("amount"))
				const currency: string = row.original.currency
				return (
					<div className="text-right font-medium">
						{formatCurrency(amount, currency as Currency)}
					</div>
				)
			},
		},
		{
			accessorKey: "amountIls",
			filterFn: numberRangeFilter,
			meta: { align: "right" },
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				const hasSort = sorted !== false
				const hasFilter = column.getIsFiltered()
				const filterValue = column.getFilterValue() as
					| NumberRangeFilter
					| undefined
				const maxValue = getColumnMaxValue(column, "amountIls")

				return (
					<div className="flex items-center justify-end gap-1">
						<span>Converted</span>
						<Button
							className={cn(
								"h-6 w-6 shrink-0",
								hasSort && "bg-primary/10 text-primary hover:bg-primary/20",
							)}
							onClick={() => {
								if (sorted === "asc") {
									column.toggleSorting(true) // to desc
								} else if (sorted === "desc") {
									column.clearSorting() // to off
								} else {
									column.toggleSorting(false) // to asc
								}
							}}
							size="icon-sm"
							variant={hasSort ? "secondary" : "ghost"}
						>
							{sorted === "asc" ? (
								<ArrowUpIcon className="h-4 w-4" />
							) : sorted === "desc" ? (
								<ArrowDownIcon className="h-4 w-4" />
							) : (
								<ArrowUpDownIcon className="h-4 w-4 text-muted-foreground" />
							)}
						</Button>
						{showFilters && (
							<Popover>
								<PopoverTrigger asChild>
									<Button
										className={cn(
											"ml-1 h-6 w-6 shrink-0",
											hasFilter &&
												"bg-primary/10 text-primary hover:bg-primary/20",
										)}
										size="icon-sm"
										variant={hasFilter ? "secondary" : "ghost"}
									>
										<FilterIcon className="h-3 w-3" />
										<span className="sr-only">Filter converted</span>
									</Button>
								</PopoverTrigger>
								<PopoverContent align="start" className="w-auto p-4">
									<div className="space-y-2">
										<h4 className="font-medium text-sm">Filter by converted</h4>
										<div className="min-w-80">
											<NumericRangeSlider
												max={maxValue}
												maxLabel="Max converted"
												min={0}
												minLabel="Min converted"
												onChange={(value: NumberRangeFilter | undefined) =>
													column.setFilterValue(value)
												}
												step={1}
												value={filterValue}
											/>
										</div>
									</div>
								</PopoverContent>
							</Popover>
						)}
					</div>
				)
			},
			cell: ({ row }) => {
				const val = row.getValue("amountIls")
				return (
					<div className="text-right">
						{typeof val === "number"
							? formatCurrency(val, displayCurrency as Currency)
							: "-"}
					</div>
				)
			},
		},
	]
}
