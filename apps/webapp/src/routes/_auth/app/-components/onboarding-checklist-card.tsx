import { useQuery } from "@tanstack/react-query"
import {
	CheckCircle2Icon,
	ChevronDownIcon,
	CircleIcon,
	XIcon,
} from "lucide-react"
import * as React from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { listRecurringTemplates } from "@/core/functions/recurring-templates"
import { getWhatsappLinkStatus } from "@/core/functions/whatsapp"
import {
	type OnboardingChecklistItemId,
	onboardingChecklistItems,
	readOnboardingChecklistDismissed,
	setOnboardingChecklistDismissed,
} from "@/core/onboarding-checklist"
import { cn } from "@/lib/utils"
import { getBudgets } from "../-functions/monthlyBudgets"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "../-functions/monthlyEntries"

const CHECKLIST_QUERY_STALE_TIME = 60 * 1000

export function OnboardingChecklistCard() {
	const [isDismissed, setIsDismissed] = React.useState<boolean | null>(null)
	const [openItemId, setOpenItemId] =
		React.useState<OnboardingChecklistItemId | null>(null)
	const hasInitializedOpen = React.useRef(false)

	const entriesQuery = useQuery({
		queryKey: MONTHLY_ENTRIES_KEY,
		queryFn: () => getMonthlyEntries(),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})
	const budgetsQuery = useQuery({
		queryKey: ["budgets"],
		queryFn: () => getBudgets(),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})
	const recurringQuery = useQuery({
		queryKey: ["recurringTemplates"],
		queryFn: () => listRecurringTemplates({ data: { includeInactive: false } }),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})
	const whatsappQuery = useQuery({
		queryKey: ["whatsappLinkStatus"],
		queryFn: () => getWhatsappLinkStatus(),
		staleTime: CHECKLIST_QUERY_STALE_TIME,
	})

	React.useEffect(() => {
		setIsDismissed(readOnboardingChecklistDismissed())
	}, [])

	const completionMap = React.useMemo(() => {
		const hasExpense =
			entriesQuery.data?.entries.some(
				(entry) => entry.entryType === "Expense",
			) ?? false
		const hasRecurringIncome =
			recurringQuery.data?.some(
				(template) => template.entryType === "Income",
			) ?? false
		const hasBudget = (budgetsQuery.data?.length ?? 0) > 0
		const hasWhatsapp = whatsappQuery.data?.linked ?? false

		return {
			"add-expense": hasExpense,
			"add-recurring-income": hasRecurringIncome,
			"add-budget": hasBudget,
			"connect-whatsapp": hasWhatsapp,
		} satisfies Record<OnboardingChecklistItemId, boolean>
	}, [
		budgetsQuery.data,
		entriesQuery.data?.entries,
		recurringQuery.data,
		whatsappQuery.data?.linked,
	])

	const items = React.useMemo(
		() =>
			onboardingChecklistItems.map((item) => ({
				...item,
				isComplete: completionMap[item.id],
			})),
		[completionMap],
	)

	const isChecklistComplete = items.every((item) => item.isComplete)
	const firstIncomplete = items.find((item) => !item.isComplete)

	const isReady =
		(entriesQuery.isSuccess || entriesQuery.isError) &&
		(budgetsQuery.isSuccess || budgetsQuery.isError) &&
		(recurringQuery.isSuccess || recurringQuery.isError) &&
		(whatsappQuery.isSuccess || whatsappQuery.isError)

	React.useEffect(() => {
		if (hasInitializedOpen.current) return
		if (!isReady) return

		setOpenItemId(firstIncomplete?.id ?? null)
		hasInitializedOpen.current = true
	}, [firstIncomplete?.id, isReady])

	if (isDismissed === null) return null
	if (isChecklistComplete) return null
	if (isDismissed) return null

	return (
		<Card>
			<CardHeader>
				<CardTitle>Onboarding checklist</CardTitle>
				<CardAction>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								aria-label="Dismiss onboarding checklist"
								size="icon"
								variant="secondary"
							>
								<XIcon />
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									Dismiss onboarding checklist?
								</AlertDialogTitle>
								<AlertDialogDescription>
									You can re-enable it from Settings until you finish the
									checklist.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									onClick={() => {
										setOnboardingChecklistDismissed(true)
										setIsDismissed(true)
									}}
								>
									Dismiss
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</CardAction>
			</CardHeader>
			<CardContent>
				<div className="grid gap-2">
					{items.map((item) => {
						const isOpen = openItemId === item.id
						return (
							<Collapsible
								className="rounded-md border"
								key={item.id}
								onOpenChange={(nextOpen) => {
									setOpenItemId(nextOpen ? item.id : null)
								}}
								open={isOpen}
							>
								<CollapsibleTrigger asChild>
									<button
										className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition hover:bg-muted/50"
										type="button"
									>
										<span className="flex items-center gap-3">
											{item.isComplete ? (
												<CheckCircle2Icon className="text-emerald-500" />
											) : (
												<CircleIcon className="text-muted-foreground" />
											)}
											<span
												className={cn(
													"font-medium text-sm",
													item.isComplete &&
														"text-muted-foreground line-through",
												)}
											>
												{item.title}
											</span>
										</span>
										<ChevronDownIcon
											className={cn("transition", isOpen && "rotate-180")}
										/>
									</button>
								</CollapsibleTrigger>
								<CollapsibleContent className="px-3 pb-3 text-muted-foreground text-sm">
									{item.description}
								</CollapsibleContent>
							</Collapsible>
						)
					})}
				</div>
			</CardContent>
		</Card>
	)
}
