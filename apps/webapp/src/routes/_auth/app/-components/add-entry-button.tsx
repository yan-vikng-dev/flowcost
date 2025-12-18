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
	const [mode, setMode] = React.useState<"expense" | "recurring-income">(
		"expense",
	)

	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const defaultCurrency = (prefsQuery.data?.defaultEntryCurrency ??
		prefsQuery.data?.displayCurrency ??
		"USD") as Currency

	const initial = React.useMemo(
		() =>
			mode === "recurring-income"
				? {
						...getDefaultEntryInitial({
							defaultCurrency,
							isRecurring: true,
						}),
						entryType: "Income" as const,
					}
				: getDefaultEntryInitial({ defaultCurrency, isRecurring: false }),
		[defaultCurrency, mode],
	)

	const { handleSubmit, handleSubmitRecurring, isPending } = useEntryMutations()

	if (!isDesktop) return null

	return (
		<>
			<div className="flex flex-col gap-2">
				<Button
					className="w-full justify-center"
					data-onboarding="add-expense"
					onClick={() => {
						setMode("expense")
						setOpen(true)
					}}
					size="lg"
					variant="default"
				>
					<span className="font-medium text-base">Add expense</span>
					<PlusIcon className="size-5" />
				</Button>
				<Button
					className="w-full justify-center"
					data-onboarding="add-income-recurring"
					onClick={() => {
						setMode("recurring-income")
						setOpen(true)
					}}
					size="lg"
					variant="secondary"
				>
					<span className="font-medium text-base">Add recurring income</span>
					<PlusIcon className="size-5" />
				</Button>
			</div>

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
