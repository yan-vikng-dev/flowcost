import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
	type CreateEntryInput,
	createEntry,
	listEntriesThisMonthPaginated,
} from "@/core/functions/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import { EntryDialog, getDefaultEntryInitial } from "../-components/EntryDialog"
import { MonthlyEntriesTable } from "./-components/entriesTable/index"

export const Route = createFileRoute("/_auth/app/advanced/")({
	loader: async ({ context }) => {
		const prefs = await context.queryClient.ensureQueryData({
			queryKey: ["userPreferences"],
			queryFn: () => getUserPreferences(),
		})

		const initialPageIndex = 0
		const initialPageSize = 10
		const initialSortBy = "executedAt" as const
		const initialSortDir = "desc" as const
		await context.queryClient.ensureQueryData({
			queryKey: [
				"entries",
				prefs.displayCurrency,
				initialPageIndex,
				initialPageSize,
				initialSortBy,
				initialSortDir,
			],
			queryFn: () =>
				listEntriesThisMonthPaginated({
					data: {
						page: initialPageIndex,
						pageSize: initialPageSize,
						sortBy: initialSortBy,
						sortDir: initialSortDir,
					},
				}),
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
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
				queryClient.invalidateQueries({
					queryKey: ["monthlyEntriesForCharts"],
				}),
			])
		},
	})

	const [open, setOpen] = React.useState(false)

	return (
		<div className="space-y-4">
			<MonthlyEntriesTable
				headerAction={
					<Button onClick={() => setOpen(true)} size="sm" variant="primary">
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
				open={open}
				submitLabel={createMut.isPending ? "Creating..." : "Create"}
				title="New Entry"
			/>
		</div>
	)
}
