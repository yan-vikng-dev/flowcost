import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { CreateEntryInput } from "@/core/functions/entries"
import { createEntry } from "@/core/functions/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import type { CreateRecurringTemplateInput } from "@/core/functions/recurring-templates"
import { createRecurringTemplate } from "@/core/functions/recurring-templates"
import type { EntryFormState } from "./entry-dialog"
import { buildRRuleFromUi } from "./recurring-card/utils"

function isValidEntryState(state: EntryFormState): boolean {
	return !!(
		state.currency &&
		state.category &&
		state.entryType &&
		state.executedAt
	)
}

function isValidRecurringState(state: EntryFormState): boolean {
	return !!(
		state.recurrence &&
		state.executedAt &&
		state.recurrence.unit &&
		state.recurrence.every &&
		state.currency &&
		state.category &&
		state.entryType
	)
}

function getAmount(state: EntryFormState): number {
	return typeof state.amount === "number" ? state.amount : 0
}

export function useEntryMutations() {
	const queryClient = useQueryClient()
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})
	const timezone = prefsQuery.data?.timezone || "UTC"

	const createMut = useMutation({
		mutationFn: (input: CreateEntryInput) => createEntry({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
			])
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

	const handleSubmit = (state: EntryFormState) => {
		if (!isValidEntryState(state)) return

		createMut.mutate({
			amount: getAmount(state),
			currency: state.currency,
			category: state.category,
			entryType: state.entryType,
			description: state.description,
			executedAt: state.executedAt,
		})
	}

	const handleSubmitRecurring = (state: EntryFormState) => {
		if (!isValidRecurringState(state) || !state.recurrence) return

		createRecurringMut.mutate({
			amount: getAmount(state),
			currency: state.currency,
			category: state.category,
			entryType: state.entryType,
			description: state.description,
			rrule: buildRRuleFromUi(state.executedAt, state.recurrence, timezone),
			dtstart: state.executedAt,
			endAt: state.endAt,
		})
	}

	return {
		createMut,
		createRecurringMut,
		handleSubmit,
		handleSubmitRecurring,
		isPending: createMut.isPending || createRecurringMut.isPending,
	}
}
