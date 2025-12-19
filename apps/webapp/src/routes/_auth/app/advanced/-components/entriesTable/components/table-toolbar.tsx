import type { Table } from "@tanstack/react-table"
import { Columns3CogIcon, CopyIcon, SearchIcon, TrashIcon } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type { MonthlyEntry } from "@/core/functions/entries"

interface TableToolbarProps {
	table: Table<MonthlyEntry>
	setConfirmIds: (ids: string[]) => void
	setConfirmOpen: (open: boolean) => void
}

export function TableToolbar({
	table,
	setConfirmIds,
	setConfirmOpen,
}: TableToolbarProps) {
	const [globalFilter, setGlobalFilter] = React.useState("")
	return (
		<div className="flex items-center gap-2 py-4">
			{table.getFilteredSelectedRowModel().rows.length > 0 && (
				<>
					<Button
						onClick={() => {
							const ids = table
								.getFilteredSelectedRowModel()
								.rows.map((r) => (r.original as { id?: string }).id)
								.filter(Boolean) as string[]
							if (ids.length === 0) return
							setConfirmIds(ids)
							setConfirmOpen(true)
						}}
						size="icon"
						variant="destructive"
					>
						<TrashIcon />
					</Button>
					<Button
						onClick={() => {
							const ids = table
								.getFilteredSelectedRowModel()
								.rows.map((r) => (r.original as { id?: string }).id)
								.filter(Boolean) as string[]
							if (ids.length === 0) return
							void navigator.clipboard.writeText(ids.join("\n")).then(() => {
								toast.success(
									`Copied ${ids.length} ID${ids.length > 1 ? "s" : ""}`,
								)
							})
						}}
						size="icon"
						variant="outline"
					>
						<CopyIcon />
					</Button>
				</>
			)}

			<div className="relative max-w-sm flex-1">
				<SearchIcon className="-translate-y-1/2 absolute top-1/2 right-3 h-4 w-4 text-muted-foreground" />
				<Input
					className="h-8 pr-9"
					onChange={(e) => setGlobalFilter(e.target.value)}
					placeholder="Search entries..."
					value={globalFilter ?? ""}
				/>
			</div>

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button size="icon" variant="outline">
						<Columns3CogIcon />
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
								onSelect={(event) => event.preventDefault()}
							>
								{column.id}
							</DropdownMenuCheckboxItem>
						))}
				</DropdownMenuContent>
			</DropdownMenu>

			{(table.getState().columnFilters.length > 0 || globalFilter) && (
				<Button
					onClick={() => {
						table.resetColumnFilters()
						setGlobalFilter("")
					}}
					size="sm"
					variant="outline"
				>
					Clear all filters
				</Button>
			)}
		</div>
	)
}
