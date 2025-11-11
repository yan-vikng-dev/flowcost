import type { Category, Currency } from "@repo/shared-lib"
import {
	useMutation,
	useQuery,
	useQueryClient,
	useSuspenseQuery,
} from "@tanstack/react-query"
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
import { Skeleton } from "@/components/ui/skeleton"
import { calculateBudgetsWithProgressFromMonthlyEntries } from "@/core/functions/budget-helpers"
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
	EXCHANGE_RATES_KEY,
	getBudgets,
	getExchangeRatesForBudgets,
} from "../../-functions/monthlyBudgets"
import {
	getMonthlyEntries,
	MONTHLY_ENTRIES_KEY,
} from "../../-functions/monthlyEntries"
import { BudgetDialog, type FormState } from "./budget-dialog"
import { BudgetItem } from "./budget-item"
import { getMonthProgress } from "./utils"
import { VirtualBudgetItem, type VirtualItemData } from "./virtual-budget-item"

function BudgetsContent({
	onDelete,
	onEdit,
	showActions,
}: {
	onDelete: (id: string) => void
	onEdit: (id: string) => void
	showActions: boolean
}) {
	const monthlyQuery = useSuspenseQuery({
		queryKey: MONTHLY_ENTRIES_KEY,
		queryFn: () => getMonthlyEntries(),
	})

	const budgetsQuery = useSuspenseQuery({
		queryKey: ["budgets"],
		queryFn: () => getBudgets(),
	})

	const exchangeRatesQuery = useSuspenseQuery({
		queryKey: EXCHANGE_RATES_KEY,
		queryFn: () => getExchangeRatesForBudgets(),
	})

	const prefsQuery = useSuspenseQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const budgetsWithProgress = React.useMemo<BudgetWithProgress[]>(() => {
		const budgets = budgetsQuery.data ?? []
		if (budgets.length === 0) return []

		const expenseEntries = (monthlyQuery.data.entries ?? []).filter(
			(entry) => entry.entryType === "Expense" && !entry.recurringTemplateId,
		)
		const displayCurrency =
			monthlyQuery.data.displayCurrency ??
			prefsQuery.data.displayCurrency ??
			"USD"

		return calculateBudgetsWithProgressFromMonthlyEntries(
			budgets,
			expenseEntries,
			displayCurrency,
			exchangeRatesQuery.data.rates,
		)
	}, [
		budgetsQuery.data,
		monthlyQuery.data,
		exchangeRatesQuery.data,
		prefsQuery.data,
	])

	const virtualItems: VirtualItemData[] = React.useMemo(() => {
		const entries = monthlyQuery.data.entries ?? []
		const displayCurrency: Currency =
			monthlyQuery.data.displayCurrency ??
			prefsQuery.data.displayCurrency ??
			"USD"

		const { percent, day, days } = getMonthProgress(DateTime.local())
		const monthProgress = {
			label: "Month progress",
			percent,
			rightLabel: `${day}/${days} days`,
		}

		const incomeSum = entries
			.filter((entry) => entry.entryType === "Income")
			.reduce((sum, entry) => sum + entry.convertedAmount, 0)
		const budgets = budgetsWithProgress
		const budgetedCats = new Set<Category>()
		for (const budget of budgets)
			for (const category of budget.categories) budgetedCats.add(category)

		const recurringExpenseSum = entries
			.filter(
				(entry) => entry.entryType === "Expense" && entry.recurringTemplateId,
			)
			.reduce((sum, entry) => sum + entry.convertedAmount, 0)

		const unbudgetedExpenseSum = entries
			.filter(
				(entry) =>
					entry.entryType === "Expense" &&
					!entry.recurringTemplateId &&
					!budgetedCats.has(entry.category),
			)
			.reduce((sum, entry) => sum + entry.convertedAmount, 0)

		const committedBudgets = budgets.reduce(
			(sum, budget) =>
				sum + Math.max(budget.amountDisplay, budget.spentDisplay),
			0,
		)
		const committed = committedBudgets + recurringExpenseSum
		const cap = Math.max(0, incomeSum - committed)
		const spentDisplay = Math.max(0, unbudgetedExpenseSum)
		const amountDisplay = cap
		const recurringBudget =
			recurringExpenseSum > 0
				? {
						label: "Recurring expenses",
						percent: 100,
						usage: recurringExpenseSum,
						currency: displayCurrency,
						showPercentLabel: false,
					}
				: null

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
						freeBudgetCalculation: {
							incomeSum,
							committedBudgets,
							recurringExpenseSum,
							committed,
							cap,
							unbudgetedExpenseSum,
						},
					}
				: null

		return [
			monthProgress,
			...(recurringBudget ? [recurringBudget] : []),
			...(freeBudget ? [freeBudget] : []),
		]
	}, [monthlyQuery.data, budgetsWithProgress, prefsQuery.data])

	const realBudgets = budgetsWithProgress

	return (
		<div>
			{realBudgets.map((budget) => (
				<div key={budget.id}>
					<BudgetItem
						budget={budget}
						onDelete={onDelete}
						onEdit={onEdit}
						showActions={showActions}
					/>
				</div>
			))}
			{realBudgets.length > 0 && <Separator className="my-2" />}
			{virtualItems.map((item) => (
				<VirtualBudgetItem data={item} key={item.label} />
			))}
		</div>
	)
}

function BudgetsHeaderActions({
	isEditMode,
	setIsEditMode,
	setCreateOpen,
}: {
	isEditMode: boolean
	setIsEditMode: (mode: boolean) => void
	setCreateOpen: (open: boolean) => void
}) {
	const budgetsQuery = useQuery({
		queryKey: ["budgets"],
		queryFn: () => getBudgets(),
	})
	const hasBudgets = (budgetsQuery.data?.length ?? 0) > 0

	return (
		<div className="flex items-center gap-2">
			{hasBudgets && (
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
	)
}

function BudgetsCardDialogs({
	createOpen,
	setCreateOpen,
	editOpen,
	setEditOpen,
	deleteId,
	setDeleteId,
	createMut,
	updateMut,
	deleteMut,
}: {
	createOpen: boolean
	setCreateOpen: (open: boolean) => void
	editOpen: string | null
	setEditOpen: (id: string | null) => void
	deleteId: string | null
	setDeleteId: (id: string | null) => void
	createMut: {
		mutate: (vars: CreateBudgetInput) => void
		isPending: boolean
	}
	updateMut: {
		mutate: (vars: { id: string } & Partial<CreateBudgetInput>) => void
		isPending: boolean
	}
	deleteMut: {
		mutate: (id: string) => void
		isPending: boolean
	}
}) {
	const prefsQuery = useSuspenseQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const budgetsQuery = useSuspenseQuery({
		queryKey: ["budgets"],
		queryFn: () => getBudgets(),
	})

	const defaultCurrency: Currency =
		(prefsQuery.data.displayCurrency as Currency) ?? "USD"

	const createInitial: FormState = {
		amount: "",
		currency: defaultCurrency,
		categories: [],
	}

	const editingBudget =
		budgetsQuery.data.find((budget) => budget.id === editOpen) || null
	const editInitial: FormState = editingBudget
		? {
				amount: editingBudget.amount,
				currency: editingBudget.currency,
				categories: editingBudget.categories,
			}
		: createInitial

	const { disabledForCreate, disabledForEdit } = React.useMemo(() => {
		const used = new Set<Category>()
		for (const budget of budgetsQuery.data)
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

	return (
		<>
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
		</>
	)
}

export function BudgetsCard() {
	authClient.useSession()
	const queryClient = useQueryClient()

	const createMut = useMutation({
		mutationFn: (input: CreateBudgetInput) => createBudget({ data: input }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
	})
	const updateMut = useMutation({
		mutationFn: (vars: { id: string } & Partial<CreateBudgetInput>) =>
			updateBudget({ data: vars }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
	})
	const deleteMut = useMutation({
		mutationFn: (id: string) => deleteBudget({ data: { id } }),
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ["budgets"] }),
	})

	const [createOpen, setCreateOpen] = React.useState(false)
	const [editOpen, setEditOpen] = React.useState<null | string>(null)
	const [deleteId, setDeleteId] = React.useState<null | string>(null)
	const [isEditMode, setIsEditMode] = React.useState(false)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Budgets</CardTitle>
				<CardAction>
					<BudgetsHeaderActions
						isEditMode={isEditMode}
						setCreateOpen={setCreateOpen}
						setIsEditMode={setIsEditMode}
					/>
				</CardAction>
			</CardHeader>
			<CardContent>
				<React.Suspense
					fallback={
						<div className="space-y-0">
							<div>
								<div className="space-y-2 py-3">
									<div className="flex items-center justify-between gap-2">
										<Skeleton className="h-6 w-20 rounded-full" />
										<Skeleton className="h-4 w-24" />
									</div>
									<Skeleton className="h-2 w-full rounded-full" />
								</div>
							</div>
							<Separator className="my-2" />
							<div>
								<div className="space-y-2 py-3">
									<div className="flex items-center justify-between gap-2">
										<Skeleton className="h-6 w-20 rounded-full" />
										<Skeleton className="h-4 w-24" />
									</div>
									<Skeleton className="h-2 w-full rounded-full" />
								</div>
							</div>
						</div>
					}
				>
					<BudgetsContent
						onDelete={(id) => setDeleteId(id)}
						onEdit={(id) => setEditOpen(id)}
						showActions={isEditMode}
					/>
				</React.Suspense>

				<React.Suspense fallback={null}>
					<BudgetsCardDialogs
						createMut={createMut}
						createOpen={createOpen}
						deleteId={deleteId}
						deleteMut={deleteMut}
						editOpen={editOpen}
						setCreateOpen={setCreateOpen}
						setDeleteId={setDeleteId}
						setEditOpen={setEditOpen}
						updateMut={updateMut}
					/>
				</React.Suspense>
			</CardContent>
		</Card>
	)
}

export default BudgetsCard
