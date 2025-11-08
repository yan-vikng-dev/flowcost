import type { Category, Currency } from "@repo/shared-lib"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { EditIcon, PlusIcon } from "lucide-react"
import { DateTime } from "luxon"
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
import type { BudgetWithProgress } from "@/core/functions/budgets"
import {
	type CreateBudgetInput,
	createBudget,
	deleteBudget,
	updateBudget,
} from "@/core/functions/budgets"
import { getUserPreferences } from "@/core/functions/preferences"
import { authClient } from "@/lib/auth-client"
import {
	getMonthlyBudgets,
	MONTHLY_BUDGETS_KEY,
} from "../../-functions/monthlyBudgets"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "../../-functions/monthlyEntries"
import { BudgetDialog, type FormState } from "./BudgetDialog"
import { BudgetItem } from "./BudgetItem"
import { getMonthProgress } from "./utils"
import { VirtualBudgetItem, type VirtualItemsMap } from "./VirtualBudgetItem"

export function BudgetsCard() {
	authClient.useSession()
	const queryClient = useQueryClient()
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const budgetsQuery = useQuery<BudgetWithProgress[]>({
		queryKey: MONTHLY_BUDGETS_KEY,
		queryFn: () => getMonthlyBudgets(),
	})

	const monthlyQuery = useQuery({
		queryKey: MONTHLY_ENTRIES_KEY,
		queryFn: () => getMonthlyEntries(),
	})

	const createMut = useMutation({
		mutationFn: (input: CreateBudgetInput) => createBudget({ data: input }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: MONTHLY_BUDGETS_KEY }),
	})
	const updateMut = useMutation({
		mutationFn: (vars: { id: string } & Partial<CreateBudgetInput>) =>
			updateBudget({ data: vars }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: MONTHLY_BUDGETS_KEY }),
	})
	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteBudget({ data: { id } }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: MONTHLY_BUDGETS_KEY }),
	})

	const [createOpen, setCreateOpen] = React.useState(false)
	const [editOpen, setEditOpen] = React.useState<null | string>(null)
	const [deleteId, setDeleteId] = React.useState<null | string>(null)
	const [isEditMode, setIsEditMode] = React.useState(false)

	const defaultCurrency: Currency =
		(prefsQuery.data?.displayCurrency as Currency) ?? "USD"

	const createInitial: FormState = {
		amount: "",
		currency: defaultCurrency,
		categories: [],
	}

	const editingBudget =
		budgetsQuery.data?.find((budget) => budget.id === editOpen) || null
	const editInitial: FormState = editingBudget
		? {
				amount: editingBudget.amount,
				currency: editingBudget.currency,
				categories: editingBudget.categories,
			}
		: createInitial

	const { disabledForCreate, disabledForEdit } = React.useMemo(() => {
		const used = new Set<Category>()
		for (const budget of budgetsQuery.data ?? [])
			budget.categories.forEach((category) => {
				used.add(category)
			})
		const all = Array.from(used)
		if (!editingBudget) return { disabledForCreate: all, disabledForEdit: all }
		const keep = new Set(editingBudget.categories)
		return {
			disabledForCreate: all,
			disabledForEdit: all.filter((category) => !keep.has(category)),
		}
	}, [budgetsQuery.data, editingBudget])

	const virtualItems: VirtualItemsMap = React.useMemo(() => {
		const entries = monthlyQuery.data?.entries ?? []
		const displayCurrency: Currency =
			monthlyQuery.data?.displayCurrency ??
			prefsQuery.data?.displayCurrency ??
			"USD"

		// month progress
		const { percent, day, days } = getMonthProgress(DateTime.local())
		const monthProgress = {
			label: "Month progress",
			percent,
			rightLabel: `${day}/${days} days`,
		}

		// free budget
		const incomeSum = entries
			.filter((entry) => entry.entryType === "Income")
			.reduce((sum, entry) => sum + (entry.amountIls ?? 0), 0)
		const budgets = budgetsQuery.data ?? []
		const budgetedCats = new Set<Category>()
		for (const budget of budgets)
			for (const category of budget.categories) budgetedCats.add(category)

		const unbudgetedExpenseSum = entries
			.filter(
				(entry) =>
					entry.entryType === "Expense" && !budgetedCats.has(entry.category),
			)
			.reduce((sum, entry) => sum + (entry.amountIls ?? 0), 0)

		const committed = budgets.reduce(
			(sum, budget) =>
				sum + Math.max(budget.amountDisplay, budget.spentDisplay),
			0,
		)
		const cap = Math.max(0, incomeSum - committed)
		const spentDisplay = Math.max(0, unbudgetedExpenseSum)
		const amountDisplay = cap

		const freeBudget =
			incomeSum > 0
				? {
						label: "Free budget",
						percent:
							amountDisplay > 0
								? Math.min(100, (spentDisplay / amountDisplay) * 100)
								: 0,
						usage: spentDisplay,
						cap: amountDisplay,
						currency: displayCurrency,
					}
				: null

		return {
			"virtual:month-progress": monthProgress,
			"virtual:free-budget": freeBudget,
		}
	}, [monthlyQuery.data, budgetsQuery.data, prefsQuery.data])

	const realBudgets = budgetsQuery.data ?? []

	// month progress is provided by virtualBudgetsData

	return (
		<Card>
			<CardHeader>
				<CardTitle>Budgets</CardTitle>
				<CardAction>
					<div className="flex items-center gap-2">
						{realBudgets.length > 0 && (
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
							aria-label="New Budget"
							onClick={() => setCreateOpen(true)}
							size="icon"
							variant="default"
						>
							<PlusIcon />
						</Button>
					</div>
				</CardAction>
			</CardHeader>
			<CardContent>
				{budgetsQuery.isLoading || monthlyQuery.isLoading ? (
					<div className="text-muted-foreground text-sm">Loading...</div>
				) : (
					<div>
						{realBudgets.map((budget, index) => (
							<div key={budget.id}>
								{index > 0 && <Separator />}
								<BudgetItem
									budget={budget}
									onDelete={(id) => setDeleteId(id)}
									onEdit={(id) => setEditOpen(id)}
									showActions={isEditMode}
								/>
							</div>
						))}
						{realBudgets.length > 0 && <Separator />}
						<VirtualBudgetItem data={virtualItems["virtual:month-progress"]} />
						{virtualItems["virtual:free-budget"] && (
							<>
								<Separator />
								<VirtualBudgetItem data={virtualItems["virtual:free-budget"]} />
							</>
						)}
					</div>
				)}

				<BudgetDialog
					disabledValues={disabledForCreate}
					initial={createInitial}
					onOpenChange={setCreateOpen}
					onSubmit={(state) => {
						const amount = typeof state.amount === "number" ? state.amount : 0
						createMut.mutate({
							amount,
							currency: state.currency,
							categories: state.categories,
						})
						setCreateOpen(false)
					}}
					open={createOpen}
					submitLabel={createMut.isPending ? "Creating..." : "Create"}
					title="New Budget"
				/>

				<BudgetDialog
					disabledValues={disabledForEdit}
					initial={editInitial}
					onOpenChange={(isOpen) => setEditOpen(isOpen ? editOpen : null)}
					onSubmit={(state) => {
						if (!editOpen) return
						const amount = typeof state.amount === "number" ? state.amount : 0
						updateMut.mutate({
							id: editOpen,
							amount,
							currency: state.currency,
							categories: state.categories,
						})
						setEditOpen(null)
					}}
					open={!!editOpen}
					submitLabel={updateMut.isPending ? "Saving..." : "Save"}
					title="Edit Budget"
				/>

				<AlertDialog
					onOpenChange={(isOpen) => setDeleteId(isOpen ? deleteId : null)}
					open={!!deleteId}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this budget?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone.
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

export default BudgetsCard
