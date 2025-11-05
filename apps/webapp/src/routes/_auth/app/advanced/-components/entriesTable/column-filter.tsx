import { entryTypes } from "@repo/data-ops/drizzle/schemas/helpers"
import type { Column } from "@tanstack/react-table"
import { FilterIcon } from "lucide-react"
import * as React from "react"
import { CategoryMultiCombobox } from "@/components/combobox/CategoryMultiCombobox"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import type {
	BooleanFilter,
	DateRangeFilter,
	EnumMultiSelectFilter,
	NumberRangeFilter,
} from "@/core/functions/filters"
import { cn } from "@/lib/utils"

interface ColumnFilterProps {
	column: Column<any>
	displayCurrency?: string
	monthStart?: Date
	monthEnd?: Date
}

export function ColumnFilter({
	column,
	monthStart,
	monthEnd,
}: ColumnFilterProps) {
	const columnId = column.id
	const filterValue = column.getFilterValue()
	const hasFilter = column.getIsFiltered()

	// State for all filter types (hooks must be called unconditionally)
	const [minAmount, setMinAmount] = React.useState("")
	const [maxAmount, setMaxAmount] = React.useState("")
	const [minConverted, setMinConverted] = React.useState("")
	const [maxConverted, setMaxConverted] = React.useState("")

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

	// Update state when filter values change
	React.useEffect(() => {
		const currentFilterValue = column.getFilterValue()
		switch (columnId) {
			case "amount": {
				const amountValue = currentFilterValue as NumberRangeFilter
				setMinAmount(amountValue?.min?.toString() ?? "")
				setMaxAmount(amountValue?.max?.toString() ?? "")
				break
			}
			case "amountIls": {
				const convertedValue = currentFilterValue as NumberRangeFilter
				setMinConverted(convertedValue?.min?.toString() ?? "")
				setMaxConverted(convertedValue?.max?.toString() ?? "")
				break
			}
		}
	}, [column, columnId])

	const getFilterComponent = () => {
		switch (columnId) {
			case "executedDate": {
				// For date filter, render Calendar directly without intermediate trigger
				const dateValue = filterValue as DateRangeFilter
				return (
					<Calendar
						defaultMonth={monthStart}
						fromDate={monthStart}
						hideNavigation
						mode="range"
						numberOfMonths={1}
						onSelect={(range) => {
							column.setFilterValue(range)
						}}
						selected={{
							from: dateValue?.from,
							to: dateValue?.to,
						}}
						showOutsideDays={false}
						toDate={monthEnd}
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
				const selectedCategories = Array.from(categorySelected) as any[]

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
				// Direct number range component
				const handleApply = () => {
					const min = minAmount ? parseFloat(minAmount) : undefined
					const max = maxAmount ? parseFloat(maxAmount) : undefined

					if (min !== undefined || max !== undefined) {
						column.setFilterValue({ min, max })
					} else {
						column.setFilterValue(undefined)
					}
				}

				const handleClear = () => {
					setMinAmount("")
					setMaxAmount("")
					column.setFilterValue(undefined)
				}

				return (
					<div className="space-y-2">
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-2">
								<Label htmlFor="min-amount">Min amount</Label>
								<Input
									id="min-amount"
									onChange={(e) => setMinAmount(e.target.value)}
									placeholder="Min amount"
									type="number"
									value={minAmount}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="max-amount">Max amount</Label>
								<Input
									id="max-amount"
									onChange={(e) => setMaxAmount(e.target.value)}
									placeholder="Max amount"
									type="number"
									value={maxAmount}
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button onClick={handleClear} size="sm" variant="outline">
								Clear
							</Button>
							<Button onClick={handleApply} size="sm">
								Apply
							</Button>
						</div>
					</div>
				)
			}

			case "amountIls": {
				// Direct number range component
				const handleApply = () => {
					const min = minConverted ? parseFloat(minConverted) : undefined
					const max = maxConverted ? parseFloat(maxConverted) : undefined

					if (min !== undefined || max !== undefined) {
						column.setFilterValue({ min, max })
					} else {
						column.setFilterValue(undefined)
					}
				}

				const handleClear = () => {
					setMinConverted("")
					setMaxConverted("")
					column.setFilterValue(undefined)
				}

				return (
					<div className="space-y-2">
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-2">
								<Label htmlFor="min-converted">Min converted</Label>
								<Input
									id="min-converted"
									onChange={(e) => setMinConverted(e.target.value)}
									placeholder="Min converted"
									type="number"
									value={minConverted}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="max-converted">Max converted</Label>
								<Input
									id="max-converted"
									onChange={(e) => setMaxConverted(e.target.value)}
									placeholder="Max converted"
									type="number"
									value={maxConverted}
								/>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button onClick={handleClear} size="sm" variant="outline">
								Clear
							</Button>
							<Button onClick={handleApply} size="sm">
								Apply
							</Button>
						</div>
					</div>
				)
			}

			case "recurring": {
				// Boolean filter for recurring entries
				const currentValue = filterValue as BooleanFilter

				return (
					<div className="space-y-2">
						<Button
							className="w-full"
							onClick={() => column.setFilterValue(undefined)}
							size="sm"
							variant={currentValue === undefined ? "secondary" : "outline"}
						>
							All
						</Button>
						<Button
							className="w-full"
							onClick={() => column.setFilterValue(true)}
							size="sm"
							variant={currentValue === true ? "secondary" : "outline"}
						>
							Recurring only
						</Button>
						<Button
							className="w-full"
							onClick={() => column.setFilterValue(false)}
							size="sm"
							variant={currentValue === false ? "secondary" : "outline"}
						>
							One-time only
						</Button>
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
		const selectedCategories = Array.from(categorySelected) as any[]
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
