import type { FilterFn } from "@tanstack/react-table"

// Date range filter for executedDate column
export const dateRangeFilter: FilterFn<any> = (row, columnId, filterValue) => {
	const rowValue = row.getValue(columnId) as string
	if (!rowValue) return false

	const rowDate = new Date(`${rowValue}T00:00:00`)
	const { from, to } = filterValue as { from?: Date; to?: Date }

	if (from && rowDate < from) return false
	if (to && rowDate > to) return false

	return true
}

// Multi-select enum filter for entryType and category columns
export const enumMultiSelectFilter: FilterFn<any> = (
	row,
	columnId,
	filterValue,
) => {
	const rowValue = row.getValue(columnId) as string
	const selectedValues = filterValue as string[]

	if (!selectedValues || selectedValues.length === 0) return true
	return selectedValues.includes(rowValue)
}

// Number range filter for amount and amountIls columns
export const numberRangeFilter: FilterFn<any> = (
	row,
	columnId,
	filterValue,
) => {
	const rowValue = row.getValue(columnId) as number | null
	const { min, max } = filterValue as { min?: number; max?: number }

	// If row value is null/undefined, only include if no filters are set
	if (rowValue == null) {
		return min == null && max == null
	}

	if (min != null && rowValue < min) return false
	if (max != null && rowValue > max) return false

	return true
}

// Text search filter for description column
export const textFilter: FilterFn<any> = (row, columnId, filterValue) => {
	const rowValue = row.getValue(columnId) as string
	const searchValue = filterValue as string

	if (!searchValue) return true
	if (!rowValue) return false

	return rowValue.toLowerCase().includes(searchValue.toLowerCase())
}

// Boolean filter for recurring column
export const booleanFilter: FilterFn<any> = (row, columnId, filterValue) => {
	const rowValue = row.getValue(columnId) as boolean
	const filterValueBool = filterValue as boolean

	if (filterValue === undefined || filterValue === null) return true
	return rowValue === filterValueBool
}

// Fulltext search filter for global search across entire entry object
export const fulltextFilter: FilterFn<any> = (row, _columnId, filterValue) => {
	const searchValue = filterValue as string

	if (!searchValue) return true
	if (!searchValue.trim()) return true

	const entry = row.original
	const searchTerm = searchValue.toLowerCase().trim()

	// Search across all relevant string fields in the entry
	const searchableFields = [
		entry.description,
		entry.category,
		entry.entryType,
		entry.currency,
		entry.amount?.toString(),
		entry.amountIls?.toString(),
		entry.executedDate,
		entry.id,
		// Include recurring template info if available
		entry.recurringTemplateId ? "recurring" : "",
		entry.isOverridden ? "overridden" : "",
	].filter(Boolean) as string[]

	return searchableFields.some((field) =>
		field.toLowerCase().includes(searchTerm),
	)
}

// Auto-remove functions for filters
dateRangeFilter.autoRemove = (val: unknown) => {
	if (!val || typeof val !== "object") return true
	const v = val as { from?: Date; to?: Date }
	return !v.from && !v.to
}
enumMultiSelectFilter.autoRemove = (val: unknown) =>
	!Array.isArray(val) || val.length === 0
numberRangeFilter.autoRemove = (val: unknown) => {
	if (!val || typeof val !== "object") return true
	const v = val as { min?: number; max?: number }
	return v.min == null && v.max == null
}
textFilter.autoRemove = (val: unknown) =>
	!val || (typeof val === "string" && val.trim() === "")
booleanFilter.autoRemove = (val: unknown) => val === undefined || val === null
fulltextFilter.autoRemove = (val: unknown) =>
	!val || (typeof val === "string" && val.trim() === "")

// Filter types for TypeScript
export type DateRangeFilter = { from?: Date; to?: Date }
export type EnumMultiSelectFilter = string[]
export type NumberRangeFilter = { min?: number; max?: number }
export type TextFilter = string
export type BooleanFilter = boolean
export type FulltextFilter = string
