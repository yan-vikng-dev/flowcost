import { entryTypes } from "@repo/data-ops/drizzle/schemas/helpers"
import type { Category } from "@repo/shared-lib"
import type { Column } from "@tanstack/react-table"
import { FilterIcon } from "lucide-react"
import * as React from "react"
import { CategoryMultiCombobox } from "@/components/combobox/CategoryMultiCombobox"
import { NumericRangeSlider } from "@/components/table-filters"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type { MonthlyEntry } from "@/core/functions/entries"
import type {
	BooleanFilter,
	DateRangeFilter,
	EnumMultiSelectFilter,
	NumberRangeFilter,
} from "@/core/functions/filters"
import { cn } from "@/lib/utils"
import { DateRangeFilterComponent } from "./components"

interface ColumnFilterProps {
	column: Column<MonthlyEntry, unknown>
	displayCurrency?: string
	monthStart?: Date
}

// Helper function to get the maximum value from a numeric column
function getColumnMaxValue(column: Column<MonthlyEntry, unknown>): number {
	// Get all rows for this column
	const rows = column.getFacetedRowModel().rows

	let maxValue = 0
	for (const row of rows) {
		const value = row.getValue(column.id)
		if (typeof value === "number" && value > maxValue) {
			maxValue = value
		}
	}

	// Return at least 1 to avoid division by zero, and round up to a nice number
	return Math.max(1, Math.ceil(maxValue * 1.1)) // Add 10% buffer
}

export function ColumnFilter({ column, monthStart }: ColumnFilterProps) {
	const columnId = column.id
	const filterValue = column.getFilterValue()
	const hasFilter = column.getIsFiltered()

	// Computed values for enum filters
	const entryTypeSelected = React.useMemo(() => {
		const enumValue =
			columnId === "entryType" ? (filterValue as EnumMultiSelectFilter) : []
		return new Set(enumValue)
	}, [columnId, filterValue])

	const categorySelected = React.useMemo(() => {
		const enumValue =
			columnId === "category" ? (filterValue as EnumMultiSelectFilter) : []
		return new Set(enumValue)
	}, [columnId, filterValue])

	const getFilterComponent = () => {
		switch (columnId) {
			case "executedDate": {
				const dateValue = filterValue as DateRangeFilter
				return (
					<DateRangeFilterComponent
						monthStart={monthStart}
						onChange={(range) => column.setFilterValue(range)}
						value={dateValue}
					/>
				)
			}

			case "entryType": {
				// Direct Command component for enum multi-select
				const toggleOption = (optionValue: string) => {
					const newValue = new Set(entryTypeSelected)
					if (newValue.has(optionValue)) {
						newValue.delete(optionValue)
					} else {
						newValue.add(optionValue)
					}

					const finalValue = Array.from(newValue)
					column.setFilterValue(finalValue.length > 0 ? finalValue : undefined)
				}

				return (
					<div className="p-2">
						<div className="space-y-1">
							{entryTypes.map((type) => {
								const isSelected = entryTypeSelected.has(type)
								return (
									<DropdownMenuCheckboxItem
										checked={isSelected}
										className="cursor-pointer"
										key={type}
										onCheckedChange={() => toggleOption(type)}
										onSelect={(event) => event.preventDefault()}
									>
										{type}
									</DropdownMenuCheckboxItem>
								)
							})}
						</div>
					</div>
				)
			}

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

			case "amount": {
				const maxValue = getColumnMaxValue(column)
				const amountValue = filterValue as NumberRangeFilter

				return (
					<NumericRangeSlider
						max={maxValue}
						maxLabel="Max amount"
						min={0}
						minLabel="Min amount"
						onChange={(value) => column.setFilterValue(value)}
						step={1}
						value={amountValue}
					/>
				)
			}

			case "amountIls": {
				const maxValue = getColumnMaxValue(column)
				const convertedValue = filterValue as NumberRangeFilter

				return (
					<NumericRangeSlider
						max={maxValue}
						maxLabel="Max converted"
						min={0}
						minLabel="Min converted"
						onChange={(value) => column.setFilterValue(value)}
						step={1}
						value={convertedValue}
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

	// Entry type keeps dropdown menu behavior
	if (columnId === "entryType") {
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
						<span className="sr-only">Filter entryType</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-auto p-0">
					{getFilterComponent()}
				</DropdownMenuContent>
			</DropdownMenu>
		)
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

	// For other filters, use Popover as before
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					className={cn(
						"ml-1 h-6 w-6 shrink-0",
						hasFilter && "bg-primary/10 text-primary hover:bg-primary/20",
					)}
					size="icon-sm"
					variant={hasFilter ? "secondary" : "ghost"}
				>
					<FilterIcon className="h-3 w-3" />
					<span className="sr-only">Filter {columnId}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className={cn("w-auto", columnId === "executedDate" ? "p-0" : "p-4")}
			>
				{columnId === "executedDate" ? (
					getFilterComponent()
				) : (
					<div className="space-y-2">
						<h4 className="font-medium text-sm">
							Filter by {columnId === "amountIls" ? "converted" : columnId}
						</h4>
						<div className="min-w-80">{getFilterComponent()}</div>
					</div>
				)}
			</PopoverContent>
		</Popover>
	)
}
