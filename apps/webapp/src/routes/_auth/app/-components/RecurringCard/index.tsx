import type { Currency } from "@repo/shared-lib"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { getUserPreferences } from "@/core/functions/preferences"
import {
	type CreateRecurringTemplateInput,
	createRecurringTemplate,
	deleteRecurringTemplate,
	listRecurringTemplates,
	type UpdateRecurringTemplateInput,
	updateRecurringTemplate,
} from "@/core/functions/recurring-templates"
import {
	EntryDialog,
	type EntryFormState,
	getDefaultEntryInitial,
} from "../EntryDialog"
import { RecurringTemplateItem } from "./RecurringTemplateItem"
import { buildRRuleFromUi } from "./utils"

export function RecurringCard() {
	const queryClient = useQueryClient()
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const templatesQuery = useQuery({
		queryKey: ["recurringTemplates"],
		queryFn: () => listRecurringTemplates({ data: { includeInactive: false } }),
	})

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
	const updateMut = useMutation({
		mutationFn: (vars: UpdateRecurringTemplateInput) =>
			updateRecurringTemplate({ data: vars }),
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

	const [createOpen, setCreateOpen] = React.useState(false)
	const [editOpen, setEditOpen] = React.useState<null | string>(null)
	const [deleteId, setDeleteId] = React.useState<null | string>(null)
	const [isEditMode, setIsEditMode] = React.useState(false)

	const defaultCurrency: Currency =
		(prefsQuery.data?.displayCurrency as Currency) ?? "USD"

	const createInitial: EntryFormState = getDefaultEntryInitial({
		defaultCurrency,
		isRecurring: true,
	})

	const editingTemplate = templatesQuery.data?.find((t) => t.id === editOpen)
	const editInitial: EntryFormState = editingTemplate
		? {
				amount: editingTemplate.amount,
				currency: editingTemplate.currency,
				category: editingTemplate.category,
				entryType: editingTemplate.entryType,
				description: editingTemplate.description ?? "",
				executedAt: editingTemplate.dtstart,
				isRecurring: true,
				recurrence: {
					every: 1,
					unit: "month",
					monthlyMode: { type: "byMonthDay" },
				},
				endAt: editingTemplate.endAt ?? undefined,
			}
		: createInitial

	return (
		<Card>
			<CardHeader>
				<CardTitle>Recurring</CardTitle>
				<CardAction>
					<div className="flex items-center gap-2">
						<Button
							aria-label={isEditMode ? "Exit edit mode" : "Enter edit mode"}
							onClick={() => setIsEditMode(!isEditMode)}
							size="icon"
							variant={isEditMode ? "primary" : "secondary"}
						>
							<EditIcon />
						</Button>
						<Button
							aria-label="New Recurring Entry"
							onClick={() => setCreateOpen(true)}
							size="icon"
							variant="primary"
						>
							<PlusIcon />
						</Button>
					</div>
				</CardAction>
			</CardHeader>
			<CardContent>
				{templatesQuery.isLoading ? (
					<div className="text-muted-foreground text-sm">Loading...</div>
				) : templatesQuery.data && templatesQuery.data.length === 0 ? (
					<div className="mx-auto grid h-[160px] w-full place-items-center text-muted-foreground text-sm">
						No recurring entries
					</div>
				) : (
					<div>
						{templatesQuery.data?.map((template, index) => (
							<div key={template.id}>
								{index > 0 && <Separator />}
								<RecurringTemplateItem
									onDelete={(id) => setDeleteId(id)}
									onEdit={(id) => setEditOpen(id)}
									onToggleActive={(id) => {
										const template = templatesQuery.data?.find(
											(t) => t.id === id,
										)
										if (template) {
											updateMut.mutate({
												id,
												isActive: !template.isActive,
											})
										}
									}}
									showActions={isEditMode}
									template={template}
								/>
							</div>
						))}
					</div>
				)}

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
						const rrule = buildRRuleFromUi(state.executedAt, state.recurrence)
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

				<EntryDialog
					editing
					initial={editInitial}
					onOpenChange={(isOpen) => setEditOpen(isOpen ? editOpen : null)}
					onSubmit={(state) => {
						if (!editOpen) return
						const amount = typeof state.amount === "number" ? state.amount : 0
						updateMut.mutate({
							id: editOpen,
							amount,
							currency: state.currency,
							category: state.category,
							entryType: state.entryType,
							description: state.description,
						})
						setEditOpen(null)
					}}
					open={!!editOpen}
					submitLabel={updateMut.isPending ? "Saving..." : "Save"}
					title="Edit Recurring Entry"
				/>

				<AlertDialog
					onOpenChange={(isOpen) => setDeleteId(isOpen ? deleteId : null)}
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
			</CardContent>
		</Card>
	)
}
