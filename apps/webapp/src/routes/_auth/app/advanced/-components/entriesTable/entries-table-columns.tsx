import type { EntryType } from "@repo/data-ops/drizzle/schemas/index"
import { type Currency, formatCurrency } from "@repo/shared-lib"
import type { ColumnDef } from "@tanstack/react-table"
import {
	ArrowDownIcon,
	ArrowUpDownIcon,
	ArrowUpIcon,
	RepeatIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCategoryIcon } from "@/config/categories"
import { getEntryTypeIcon } from "@/config/entryTypes"
import type { MonthlyEntry } from "@/core/functions/entries"
import {
	booleanFilter,
	dateRangeFilter,
	enumMultiSelectFilter,
	numberRangeFilter,
} from "@/core/functions/filters"
import { cn } from "@/lib/utils"
import { ColumnFilter } from "./column-filter"

interface EntriesTableColumnsOptions {
	displayCurrency: string
	showFilters?: boolean
	monthStart?: Date
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
						{showFilters && (
							<ColumnFilter column={column} displayCurrency={displayCurrency} />
						)}
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
							<ColumnFilter
								column={column}
								displayCurrency={displayCurrency}
								monthStart={monthStart}
							/>
						)}
					</div>
				)
			},
			cell: ({ row }) => {
				const dateStr = row.original.executedDate
				const dt = new Date(`${dateStr}T00:00:00`)
				return dt.toLocaleDateString(undefined, {
					year: "numeric",
					month: "short",
					day: "2-digit",
				})
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
						{showFilters && (
							<ColumnFilter column={column} displayCurrency={displayCurrency} />
						)}
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
						{showFilters && (
							<ColumnFilter column={column} displayCurrency={displayCurrency} />
						)}
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
							<ColumnFilter column={column} displayCurrency={displayCurrency} />
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
							<ColumnFilter column={column} displayCurrency={displayCurrency} />
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
