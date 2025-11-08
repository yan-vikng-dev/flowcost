import type { Currency } from "@repo/shared-lib"
import {
	useMutation,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query"
import { EditIcon, PlusIcon } from "lucide-react"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { getUserPreferences } from "@/core/functions/preferences"
import {
	type CreateRecurringTemplateInput,
	createRecurringTemplate,
	deleteRecurringTemplate,
	listRecurringTemplates,
	stopRecurringTemplate,
} from "@/core/functions/recurring-templates"
import {
	EntryDialog,
	type EntryFormState,
	getDefaultEntryInitial,
} from "../EntryDialog"
import { RecurringTemplateItem } from "./RecurringTemplateItem"
import { buildRRuleFromUi } from "./utils"

function RecurringHeaderActions({
	isEditMode,
	setIsEditMode,
	setCreateOpen,
}: {
	isEditMode: boolean
	setIsEditMode: (mode: boolean) => void
	setCreateOpen: (open: boolean) => void
}) {
	const templatesQuery = useSuspenseQuery({
		queryKey: ["recurringTemplates"],
		queryFn: () => listRecurringTemplates({ data: { includeInactive: false } }),
	})

	return (
		<div className="flex items-center gap-2">
			{templatesQuery.data && templatesQuery.data.length > 0 && (
				<Button
					aria-label={isEditMode ? "Exit edit mode" : "Enter edit mode"}
					onClick={() => setIsEditMode(!isEditMode)}
					size="icon"
					variant={isEditMode ? "default" : "secondary"}
				>
					<EditIcon />
				</Button>
			)}
			<Button
				aria-label="New Recurring Entry"
				onClick={() => setCreateOpen(true)}
				size="icon"
				variant="default"
			>
				<PlusIcon />
			</Button>
		</div>
	)
}

function RecurringContent({
	onDelete,
	onStop,
	showActions,
}: {
	onDelete: (id: string) => void
	onStop: (id: string) => void
	showActions: boolean
}) {
	const templatesQuery = useSuspenseQuery({
		queryKey: ["recurringTemplates"],
		queryFn: () => listRecurringTemplates({ data: { includeInactive: false } }),
	})

	if (templatesQuery.data && templatesQuery.data.length === 0) {
		return (
			<div className="mx-auto grid h-[160px] w-full place-items-center text-muted-foreground text-sm">
				No recurring entries
			</div>
		)
	}

	return (
		<div>
			{templatesQuery.data?.map((template, index) => (
				<div key={template.id}>
					{index > 0 && <Separator />}
					<RecurringTemplateItem
						onDelete={onDelete}
						onStop={onStop}
						showActions={showActions}
						template={template}
					/>
				</div>
			))}
		</div>
	)
}

function RecurringDialogs({
	createOpen,
	setCreateOpen,
	deleteId,
	setDeleteId,
	stopId,
	setStopId,
	createMut,
	deleteMut,
	stopMut,
}: {
	createOpen: boolean
	setCreateOpen: (open: boolean) => void
	deleteId: string | null
	setDeleteId: (id: string | null) => void
	stopId: string | null
	setStopId: (id: string | null) => void
	createMut: {
		mutate: (vars: CreateRecurringTemplateInput) => void
		isPending: boolean
	}
	deleteMut: {
		mutate: (id: string) => void
		isPending: boolean
	}
	stopMut: {
		mutate: (id: string) => void
		isPending: boolean
	}
}) {
	const prefsQuery = useSuspenseQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const defaultCurrency: Currency =
		(prefsQuery.data.displayCurrency as Currency) ?? "USD"

	const timezone = prefsQuery.data.timezone || "UTC"

	const createInitial: EntryFormState = getDefaultEntryInitial({
		defaultCurrency,
		isRecurring: true,
	})

	return (
		<>
			<EntryDialog
				editing={false}
				initial={createInitial}
				onOpenChange={setCreateOpen}
				onSubmit={() => {}}
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
					createMut.mutate({
						amount,
						currency: state.currency,
						category: state.category,
						entryType: state.entryType,
						description: state.description,
						rrule,
						dtstart: state.executedAt,
						endAt: state.endAt,
					})
					setCreateOpen(false)
				}}
				open={createOpen}
				submitLabel={createMut.isPending ? "Creating..." : "Create"}
				title="New Recurring Entry"
			/>

			<AlertDialog
				onOpenChange={(isOpen) => {
					if (!isOpen) setDeleteId(null)
				}}
				open={!!deleteId}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete this recurring entry?</AlertDialogTitle>
						<AlertDialogDescription>
							This will delete the recurring entry and all entries (past and
							future). This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setDeleteId(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (deleteId) {
									deleteMut.mutate(deleteId)
								}
								setDeleteId(null)
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog
				onOpenChange={(isOpen) => {
					if (!isOpen) setStopId(null)
				}}
				open={!!stopId}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Stop this recurring entry?</AlertDialogTitle>
						<AlertDialogDescription>
							This will stop the recurrence today. All future entries (starting
							from tomorrow) will be deleted. Past entries and today's entry
							will remain unchanged.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setStopId(null)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (stopId) {
									stopMut.mutate(stopId)
								}
								setStopId(null)
							}}
						>
							Stop
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export function RecurringCard() {
	const queryClient = useQueryClient()

	const createMut = useMutation({
		mutationFn: (input: CreateRecurringTemplateInput) =>
			createRecurringTemplate({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] }),
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
			])
		},
	})
	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteRecurringTemplate({ data: { id } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] }),
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
			])
		},
	})
	const stopMut = useMutation({
		mutationFn: (id: string) => stopRecurringTemplate({ data: { id } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] }),
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
			])
		},
	})

	const [createOpen, setCreateOpen] = React.useState(false)
	const [deleteId, setDeleteId] = React.useState<null | string>(null)
	const [stopId, setStopId] = React.useState<null | string>(null)
	const [isEditMode, setIsEditMode] = React.useState(false)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recurring</CardTitle>
				<CardAction>
					<React.Suspense fallback={<Skeleton className="h-10 w-20" />}>
						<RecurringHeaderActions
							isEditMode={isEditMode}
							setCreateOpen={setCreateOpen}
							setIsEditMode={setIsEditMode}
						/>
					</React.Suspense>
				</CardAction>
			</CardHeader>
			<CardContent>
				<React.Suspense
					fallback={
						<div>
							<div className="flex items-center justify-between gap-4 py-3">
								<div className="flex flex-1 items-center gap-3">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<Skeleton className="h-5 w-20 rounded-full" />
											<Skeleton className="h-4 w-16" />
											<Skeleton className="h-4 w-24" />
										</div>
										<Skeleton className="mt-1 h-4 w-40" />
									</div>
								</div>
							</div>
							<Separator />
							<div className="flex items-center justify-between gap-4 py-3">
								<div className="flex flex-1 items-center gap-3">
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<Skeleton className="h-5 w-20 rounded-full" />
											<Skeleton className="h-4 w-16" />
											<Skeleton className="h-4 w-24" />
										</div>
										<Skeleton className="mt-1 h-4 w-40" />
									</div>
								</div>
							</div>
						</div>
					}
				>
					<RecurringContent
						onDelete={(id) => setDeleteId(id)}
						onStop={(id) => setStopId(id)}
						showActions={isEditMode}
					/>
				</React.Suspense>

				<React.Suspense fallback={null}>
					<RecurringDialogs
						createMut={createMut}
						createOpen={createOpen}
						deleteId={deleteId}
						deleteMut={deleteMut}
						setCreateOpen={setCreateOpen}
						setDeleteId={setDeleteId}
						setStopId={setStopId}
						stopId={stopId}
						stopMut={stopMut}
					/>
				</React.Suspense>
			</CardContent>
		</Card>
	)
}
