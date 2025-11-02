import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { UpdateUserPreferencesInput } from "@/core/functions/preferences"
import {
	type getUserPreferences,
	updateUserPreferences,
} from "@/core/functions/preferences"

export function useOptimisticPreferences() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (input: UpdateUserPreferencesInput) =>
			updateUserPreferences({ data: input }),
		onMutate: async (newData) => {
			await queryClient.cancelQueries({ queryKey: ["userPreferences"] })

			const previousPrefs = queryClient.getQueryData<
				Awaited<ReturnType<typeof getUserPreferences>>
			>(["userPreferences"])

			if (previousPrefs) {
				const optimisticPrefs = { ...previousPrefs, ...newData }
				queryClient.setQueryData(["userPreferences"], optimisticPrefs)
			}

			return { previousPrefs }
		},
		onError: (_err, _newData, context) => {
			if (context?.previousPrefs) {
				queryClient.setQueryData(["userPreferences"], context.previousPrefs)
			}
		},
		onSettled: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["userPreferences"] }),
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
			])
		},
	})
}
