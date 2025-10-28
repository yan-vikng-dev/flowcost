import type { Category, Currency } from "@repo/shared-config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { DateTime } from "luxon"
import * as React from "react"
import { Button } from "@/components/ui/button"
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
import {
	Card,
	CardAction,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	type BudgetWithProgress,
	type CreateBudgetInput,
	createBudget,
	deleteBudget,
	listBudgetsWithProgress,
	updateBudget,
} from "@/core/functions/budgets"
import { getUserPreferences } from "@/core/functions/preferences"
import { authClient } from "@/lib/auth-client"
import { getMonthlyEntriesForCharts } from "../../-functions/monthlyEntries"
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

	const budgetsQuery = useQuery({
		queryKey: ["budgets:list"],
		queryFn: () => listBudgetsWithProgress(),
	})

	const monthlyQuery = useQuery({
		queryKey: ["monthlyEntriesForCharts"],
		queryFn: () => getMonthlyEntriesForCharts(),
	})

	const createMut = useMutation({
		mutationFn: (input: CreateBudgetInput) => createBudget({ data: input }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["budgets:list"] }),
	})
	const updateMut = useMutation({
		mutationFn: (vars: { id: string } & Partial<CreateBudgetInput>) =>
			updateBudget({ data: vars }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["budgets:list"] }),
	})
	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteBudget({ data: { id } }),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["budgets:list"] }),
	})

	const [createOpen, setCreateOpen] = React.useState(false)
	const [editOpen, setEditOpen] = React.useState<null | string>(null)
	const [deleteId, setDeleteId] = React.useState<null | string>(null)

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
			.reduce((sum, entry) => sum + entry.amountConverted, 0)
		const budgets = budgetsQuery.data ?? []
		const budgetedCats = new Set<Category>()
		for (const budget of budgets)
			for (const category of budget.categories) budgetedCats.add(category)

		const unbudgetedExpenseSum = entries
			.filter(
				(entry) =>
					entry.entryType === "Expense" && !budgetedCats.has(entry.category),
			)
			.reduce((sum, entry) => sum + entry.amountConverted, 0)

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

	const realBudgets: BudgetWithProgress[] = budgetsQuery.data ?? []

	// month progress is provided by virtualBudgetsData

	return (
		<Card>
			<CardHeader>
				<CardTitle>Budgets</CardTitle>
				<CardAction>
					<Button
						onClick={() => setCreateOpen(true)}
						size="sm"
						variant="primary"
					>
						New Budget
					</Button>
				</CardAction>
			</CardHeader>
			<CardContent className="space-y-4">
				{budgetsQuery.isLoading || monthlyQuery.isLoading ? (
					<div className="text-muted-foreground text-sm">Loading...</div>
				) : (
					<div className="space-y-4">
						{realBudgets.map((budget) => (
							<BudgetItem
								budget={budget}
								key={budget.id}
							onDelete={(id) => setDeleteId(id)}
								onEdit={(id) => setEditOpen(id)}
							/>
						))}
						<VirtualBudgetItem data={virtualItems["virtual:month-progress"]} />
						{virtualItems["virtual:free-budget"] && (
							<VirtualBudgetItem data={virtualItems["virtual:free-budget"]} />
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

				<AlertDialog onOpenChange={(isOpen) => setDeleteId(isOpen ? deleteId : null)} open={!!deleteId}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete this budget?</AlertDialogTitle>
							<AlertDialogDescription>
								This action cannot be undone.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
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
