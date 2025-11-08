import type { Category } from "@repo/shared-lib"
import type { Column } from "@tanstack/react-table"
import { FilterIcon } from "lucide-react"
import * as React from "react"
import { CategoryMultiCombobox } from "@/components/combobox/CategoryMultiCombobox"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MonthlyEntry } from "@/core/functions/entries"
import type {
	BooleanFilter,
	EnumMultiSelectFilter,
} from "@/core/functions/filters"
import { cn } from "@/lib/utils"

interface ColumnFilterProps {
	column: Column<MonthlyEntry, unknown>
}

export function ColumnFilter({ column }: ColumnFilterProps) {
	const columnId = column.id
	const filterValue = column.getFilterValue()
	const hasFilter = column.getIsFiltered()

	const categorySelected = React.useMemo(() => {
		const enumValue =
			columnId === "category" ? (filterValue as EnumMultiSelectFilter) : []
		return new Set(enumValue)
	}, [columnId, filterValue])

	const getFilterComponent = () => {
		switch (columnId) {
			case "category": {
				const selectedCategories = Array.from(categorySelected) as Category[]

				return (
					<CategoryMultiCombobox
						contentWidthClass="w-auto"
						maxVisibleChips={0}
						onChange={(next) => {
							column.setFilterValue(next.length > 0 ? next : undefined)
						}}
						placeholder="Filter categories..."
						value={selectedCategories}
					/>
				)
			}

			case "recurring": {
				// Boolean filter for recurring entries - using checkboxes like entryType
				const currentValue = filterValue as BooleanFilter
				const isRecurringSelected = currentValue === true
				const isOneTimeSelected = currentValue === false

				const toggleRecurring = () => {
					if (isRecurringSelected) {
						// If recurring is selected, deselect it (go to "All")
						column.setFilterValue(undefined)
					} else {
						// Select recurring only
						column.setFilterValue(true)
					}
				}

				const toggleOneTime = () => {
					if (isOneTimeSelected) {
						// If one-time is selected, deselect it (go to "All")
						column.setFilterValue(undefined)
					} else {
						// Select one-time only
						column.setFilterValue(false)
					}
				}

				return (
					<div className="p-2">
						<div className="space-y-1">
							<DropdownMenuCheckboxItem
								checked={isRecurringSelected}
								className="cursor-pointer"
								onCheckedChange={toggleRecurring}
								onSelect={(event) => event.preventDefault()}
							>
								Recurring
							</DropdownMenuCheckboxItem>
							<DropdownMenuCheckboxItem
								checked={isOneTimeSelected}
								className="cursor-pointer"
								onCheckedChange={toggleOneTime}
								onSelect={(event) => event.preventDefault()}
							>
								One-time
							</DropdownMenuCheckboxItem>
						</div>
					</div>
				)
			}

			default:
				return null
		}
	}

	// Recurring keeps dropdown menu behavior
	if (columnId === "recurring") {
		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						className={cn(
							"ml-1 h-6 w-6 shrink-0",
							hasFilter && "bg-primary/10 text-primary hover:bg-primary/20",
						)}
						size="icon-sm"
						variant={hasFilter ? "secondary" : "ghost"}
					>
						<FilterIcon className="h-3 w-3" />
						<span className="sr-only">Filter recurring</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-auto p-0">
					{getFilterComponent()}
				</DropdownMenuContent>
			</DropdownMenu>
		)
	}

	// Category uses the filter button as the combobox trigger directly
	if (columnId === "category") {
		const selectedCategories = Array.from(categorySelected) as Category[]
		return (
			<CategoryMultiCombobox
				contentWidthClass="w-auto"
				maxVisibleChips={0}
				onChange={(next) => {
					column.setFilterValue(next.length > 0 ? next : undefined)
				}}
				placeholder="Filter categories..."
				trigger={
					<Button
						className={cn(
							"ml-1 h-6 w-6 shrink-0",
							hasFilter && "bg-primary/10 text-primary hover:bg-primary/20",
						)}
						size="icon-sm"
						variant={hasFilter ? "secondary" : "ghost"}
					>
						<FilterIcon className="h-3 w-3" />
						<span className="sr-only">Filter category</span>
					</Button>
				}
				value={selectedCategories}
			/>
		)
	}

	return null
}
