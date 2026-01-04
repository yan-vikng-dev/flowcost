import type { EntryType } from "@repo/db/drizzle/schemas/index"
import { ArrowDownIcon, ArrowUpIcon, type LucideIcon } from "lucide-react"

export const entryTypeIcons: Record<EntryType, LucideIcon> = {
	Expense: ArrowDownIcon,
	Income: ArrowUpIcon,
} as const

export const getEntryTypeIcon = (entryType: EntryType) => {
	return entryTypeIcons[entryType]
}
