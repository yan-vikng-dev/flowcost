import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { type CreateEntryInput, createEntry } from "@/core/functions/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import {
	type CreateRecurringTemplateInput,
	createRecurringTemplate,
} from "@/core/functions/recurring-templates"
import { EntryDialog, getDefaultEntryInitial } from "../-components/EntryDialog"
import { buildRRuleFromUi } from "../-components/RecurringCard/utils"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "../-functions/monthlyEntries"
import { MonthlyEntriesTable } from "./-components/entriesTable/index"

export const Route = createFileRoute("/_auth/app/advanced/")({
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData({
			queryKey: ["userPreferences"],
			queryFn: () => getUserPreferences(),
		})

		await context.queryClient.ensureQueryData({
			queryKey: MONTHLY_ENTRIES_KEY,
			queryFn: () => getMonthlyEntries(),
		})
	},
	component: RouteComponent,
})

function RouteComponent() {
	const queryClient = useQueryClient()
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})
	const createMut = useMutation({
		mutationFn: (input: CreateEntryInput) => createEntry({ data: input }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["entries"] })
		},
	})
	const createRecurringMut = useMutation({
		mutationFn: (input: CreateRecurringTemplateInput) =>
			createRecurringTemplate({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
				queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] }),
			])
		},
	})

	const [open, setOpen] = React.useState(false)

	const timezone = prefsQuery.data?.timezone || "UTC"

	return (
		<div className="space-y-4">
			<MonthlyEntriesTable
				headerAction={
					<Button onClick={() => setOpen(true)} size="sm" variant="default">
						New Entry
					</Button>
				}
			/>
			<EntryDialog
				initial={getDefaultEntryInitial({
					defaultCurrency: prefsQuery.data?.defaultEntryCurrency ?? "USD",
				})}
				onOpenChange={setOpen}
				onSubmit={(state) => {
					const amount = typeof state.amount === "number" ? state.amount : 0
					createMut.mutate({
						amount,
						currency: state.currency,
						category: state.category,
						entryType: state.entryType,
						description: state.description,
						executedAt: state.executedAt,
					})
					setOpen(false)
				}}
				onSubmitRecurring={(state) => {
					if (
						!state.recurrence ||
						!state.executedAt ||
						!state.recurrence.unit ||
						!state.recurrence.every
					)
						return
					const amount = typeof state.amount === "number" ? state.amount : 0
					const rrule = buildRRuleFromUi(
						state.executedAt,
						state.recurrence,
						timezone,
					)
					createRecurringMut.mutate({
						amount,
						currency: state.currency,
						category: state.category,
						entryType: state.entryType,
						description: state.description,
						rrule,
						dtstart: state.executedAt,
						endAt: state.endAt,
					})
					setOpen(false)
				}}
				open={open}
				submitLabel={
					createMut.isPending || createRecurringMut.isPending
						? "Creating..."
						: "Create"
				}
				title="New Entry"
			/>
		</div>
	)
}
