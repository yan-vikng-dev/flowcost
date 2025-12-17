import type { Currency } from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import { PlusIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { getUserPreferences } from "@/core/functions/preferences"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { EntryDialog, getDefaultEntryInitial } from "./entry-dialog"
import { useEntryMutations } from "./useEntryMutations"

export function AddEntryButton() {
	const isDesktop = useIsDesktop()
	const [open, setOpen] = React.useState(false)

	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const defaultCurrency = (prefsQuery.data?.defaultEntryCurrency ??
		prefsQuery.data?.displayCurrency ??
		"USD") as Currency

	const initial = React.useMemo(
		() => getDefaultEntryInitial({ defaultCurrency, isRecurring: false }),
		[defaultCurrency],
	)

	const { handleSubmit, handleSubmitRecurring, isPending } = useEntryMutations()

	if (!isDesktop) return null

	return (
		<>
			<Button
				className="w-full justify-center"
				onClick={() => setOpen(true)}
				size="lg"
				variant="default"
			>
				<span className="font-medium text-base">Add entry</span>
				<PlusIcon className="size-5" />
			</Button>

			<EntryDialog
				initial={initial}
				isPending={isPending}
				onOpenChange={setOpen}
				onSubmit={(state) => {
					handleSubmit(state)
					setOpen(false)
				}}
				onSubmitRecurring={(state) => {
					handleSubmitRecurring(state)
					setOpen(false)
				}}
				open={open}
			/>
		</>
	)
}
