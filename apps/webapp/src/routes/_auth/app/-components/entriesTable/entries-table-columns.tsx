import type { EntryType } from "@repo/data-ops/drizzle/schemas/entries"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getCategoryIcon } from "@/config/categories"
import { getEntryTypeIcon } from "@/config/entryTypes"
import type { MonthlyEntry } from "@/core/functions/entries"

function formatCurrency(amount: number, currency: string, locale = "en-US") {
	try {
		return new Intl.NumberFormat(locale, {
			style: "currency",
			currency,
		}).format(amount)
	} catch {
		return `${currency} ${amount.toFixed(2)}`
	}
}

export function entriesTableColumns(
	displayCurrency: string,
): ColumnDef<MonthlyEntry>[] {
	return [
		{
			accessorKey: "executedAt",
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				return (
					<Button
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						variant="ghost"
					>
						Date
						{sorted === "asc" ? (
							<ArrowUpIcon className="ml-2 h-4 w-4" />
						) : sorted === "desc" ? (
							<ArrowDownIcon className="ml-2 h-4 w-4" />
						) : (
							<ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
						)}
					</Button>
				)
			},
			cell: ({ row }) => {
				const dt = row.original.executedAt
				return new Date(dt).toLocaleDateString(undefined, {
					year: "numeric",
					month: "short",
					day: "2-digit",
				})
			},
			sortingFn: (a, b) =>
				a.original.executedAt.getTime() - b.original.executedAt.getTime(),
		},
		{
			accessorKey: "entryType",
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				return (
					<Button
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						variant="ghost"
					>
						Type
						{sorted === "asc" ? (
							<ArrowUpIcon className="ml-2 h-4 w-4" />
						) : sorted === "desc" ? (
							<ArrowDownIcon className="ml-2 h-4 w-4" />
						) : (
							<ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
						)}
					</Button>
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
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				return (
					<Button
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						variant="ghost"
					>
						Category
						{sorted === "asc" ? (
							<ArrowUpIcon className="ml-2 h-4 w-4" />
						) : sorted === "desc" ? (
							<ArrowDownIcon className="ml-2 h-4 w-4" />
						) : (
							<ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
						)}
					</Button>
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
			meta: { align: "right" },
			header: ({ column }) => {
				const sorted = column.getIsSorted()
				return (
					<Button
						className="ml-auto"
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
						variant="ghost"
					>
						Amount
						{sorted === "asc" ? (
							<ArrowUpIcon className="ml-2 h-4 w-4" />
						) : sorted === "desc" ? (
							<ArrowDownIcon className="ml-2 h-4 w-4" />
						) : (
							<ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
						)}
					</Button>
				)
			},
			cell: ({ row }) => {
				const amount = Number(row.getValue("amount"))
				const currency: string = row.original.currency
				return (
					<div className="text-right font-medium">
						{formatCurrency(amount, currency)}
					</div>
				)
			},
		},
		{
			accessorKey: "amountIls",
			meta: { align: "right" },
			enableSorting: false,
			header: () => <div className="ml-auto text-right">Converted</div>,
			cell: ({ row }) => {
				const val = row.getValue("amountIls")
				return (
					<div className="text-right">
						{typeof val === "number"
							? formatCurrency(val, displayCurrency)
							: "-"}
					</div>
				)
			},
		},
	]
}
