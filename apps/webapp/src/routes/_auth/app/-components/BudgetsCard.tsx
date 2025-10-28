import type { Category, Currency } from "@repo/shared-config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Pencil, Trash2 } from "lucide-react"
import * as React from "react"
import { CategoryMultiCombobox } from "@/components/combobox/CategoryMultiCombobox"
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getCategoryIcon } from "@/config/categories"
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
import { getMonthlyEntriesForCharts } from "../-functions/monthlyEntries"

function ProgressBar({ percent }: { percent: number }) {
	const clamped = Math.max(0, Math.min(100, percent))
	let barClass = "bg-primary"
	if (clamped >= 90) barClass = "bg-destructive"
	else if (clamped >= 60) barClass = "bg-yellow-500"
	return (
		<div className="h-2 w-full rounded-full bg-muted/50">
			<div
				className={`h-2 rounded-full ${barClass}`}
				style={{ width: `${clamped}%` }}
			/>
		</div>
	)
}

// category selector replaced by CategoryMultiCombobox

type FormState = {
	amount: number | ""
	currency: Currency
	categories: Category[]
}

function BudgetDialog({
	open,
	onOpenChange,
	initial,
	onSubmit,
	title,
	submitLabel,
	disabledValues,
}: {
	open: boolean
	onOpenChange: (v: boolean) => void
	initial: FormState
	onSubmit: (state: FormState) => void
	title: string
	submitLabel: string
	disabledValues?: Category[]
}) {
	const [state, setState] = React.useState<FormState>(initial)
	const amountId = React.useId()
	React.useEffect(() => setState(initial), [initial])

	const valid =
		typeof state.amount === "number" &&
		state.amount > 0 &&
		state.categories.length > 0

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						Set a monthly limit for selected categories.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="grid gap-2">
						<Label htmlFor={amountId}>Monthly amount</Label>
						<Input
							id={amountId}
							inputMode="decimal"
							onChange={(e) => {
								const v = e.target.value
								const num = Number(v)
								setState((s) => ({
									...s,
									amount: Number.isFinite(num) ? num : v === "" ? "" : s.amount,
								}))
							}}
							placeholder="0.00"
							value={state.amount}
						/>
					</div>

					<div className="grid gap-2">
						<Label>Currency</Label>
						<CurrencyCombobox
							onChange={(c) => setState((s) => ({ ...s, currency: c }))}
							value={state.currency}
						/>
					</div>

					<div className="grid gap-2">
						<Label>Categories</Label>
						<CategoryMultiCombobox
							disabledValues={disabledValues}
							onChange={(cats) => setState((s) => ({ ...s, categories: cats }))}
							value={state.categories}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						disabled={!valid}
						onClick={() =>
							valid &&
							onSubmit({
								amount: state.amount === "" ? 0 : state.amount,
								currency: state.currency,
								categories: state.categories,
							})
						}
					>
						{submitLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

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

	useQuery({
		queryKey: ["connectionState"],
		queryFn: async () => {
			const mod = await import("../settings/-functions/connections")
			return mod.getConnectionState()
		},
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

	// Dialog state
	const [createOpen, setCreateOpen] = React.useState(false)
	const [editOpen, setEditOpen] = React.useState<null | string>(null)

	const defaultCurrency: Currency =
		(prefsQuery.data?.displayCurrency as Currency) ?? "USD"

	const createInitial: FormState = {
		amount: "",
		currency: defaultCurrency as Currency,
		categories: [],
	}

	const editingBudget =
		budgetsQuery.data?.find((b) => b.id === editOpen) || null
	const editInitial: FormState = editingBudget
		? {
				amount: editingBudget.amount,
				currency: editingBudget.currency,
				categories: editingBudget.categories,
			}
		: createInitial

	// Compute categories used by any existing budget to disable in the picker
	const usedCategoriesAll: Category[] = React.useMemo(() => {
		const set = new Set<Category>()
		for (const b of budgetsQuery.data ?? []) {
			for (const c of b.categories) set.add(c as Category)
		}
		return Array.from(set)
	}, [budgetsQuery.data])

	const disabledForCreate = usedCategoriesAll
	const disabledForEdit: Category[] = React.useMemo(() => {
		if (!editingBudget) return usedCategoriesAll
		const keep = new Set(editingBudget.categories as Category[])
		return usedCategoriesAll.filter((c) => !keep.has(c))
	}, [editingBudget, usedCategoriesAll])

	// owner tag removed; no need for user/partner labels

	// Compute virtual "free budget" based on monthly income minus committed budgets, and usage as unbudgeted expenses
	type VirtualBudget = BudgetWithProgress & { virtual: true }
	const virtualBudget: VirtualBudget | null = React.useMemo(() => {
		const entries = monthlyQuery.data?.entries ?? []
		const incomeSum = entries
			.filter((e) => e.entryType === "Income")
			.reduce((acc, e) => acc + e.amountConverted, 0)
		if (incomeSum <= 0) return null

		const budgets = budgetsQuery.data ?? []
		const displayCurrency =
			monthlyQuery.data?.displayCurrency ??
			(prefsQuery.data?.displayCurrency as Currency) ??
			"USD"

		const budgetedCats = new Set<Category>()
		for (const b of budgets)
			for (const c of b.categories) budgetedCats.add(c as Category)

		const unbudgetedExpenseSum = entries
			.filter(
				(e) =>
					e.entryType === "Expense" &&
					!budgetedCats.has(e.category as Category),
			)
			.reduce((acc, e) => acc + e.amountConverted, 0)

		const committed = budgets.reduce(
			(acc, b) => acc + Math.max(b.amountDisplay, b.spentDisplay),
			0,
		)
		const cap = Math.max(0, incomeSum - committed)
		const spentDisplay = Math.max(0, unbudgetedExpenseSum)
		const amountDisplay = cap
		const remainingDisplay = Math.max(0, amountDisplay - spentDisplay)
		const utilizationPct =
			amountDisplay > 0
				? Math.min(100, (spentDisplay / amountDisplay) * 100)
				: 0

		return {
			id: "virtual:free-budget",
			userId: "",
			amount: amountDisplay,
			currency: displayCurrency as Currency,
			categories: [],
			displayCurrency: displayCurrency as Currency,
			amountDisplay,
			spentDisplay,
			remainingDisplay,
			utilizationPct,
			// local flag for rendering-only logic
			virtual: true as const,
		}
	}, [monthlyQuery.data, budgetsQuery.data, prefsQuery.data])

	const displayBudgets: Array<BudgetWithProgress | VirtualBudget> =
		React.useMemo(() => {
			const base = (budgetsQuery.data ?? []) as BudgetWithProgress[]
			return virtualBudget ? [...base, virtualBudget] : base
		}, [budgetsQuery.data, virtualBudget])

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-2">
				<CardTitle>Budgets</CardTitle>
				<Button onClick={() => setCreateOpen(true)} variant="primary">
					New Budget
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				{budgetsQuery.isLoading || monthlyQuery.isLoading ? (
					<div className="text-muted-foreground text-sm">Loading...</div>
				) : displayBudgets.length === 0 ? (
					<div className="text-muted-foreground text-sm">
						No budgets yet. Create your first one.
					</div>
				) : (
					<div className="space-y-4">
						{displayBudgets.map((b) => (
							<div className="space-y-2 rounded-md border p-3" key={b.id}>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										{"virtual" in b ? (
											<div className="flex flex-wrap gap-1">
												<Badge variant="secondary">Free budget</Badge>
											</div>
										) : (
											<>
												{/* Categories chips */}
												<div className="flex flex-wrap gap-1">
													{b.categories.slice(0, 3).map((c: Category) => {
														const Icon = getCategoryIcon(c)
														return (
															<Badge key={c} variant="secondary">
																<span className="mr-1 inline-flex w-4 justify-center">
																	<Icon className="size-3.5" />
																</span>
																{c}
															</Badge>
														)
													})}
													{b.categories.length > 3 && (
														<Badge variant="outline">
															+{b.categories.length - 3}
														</Badge>
													)}
												</div>
												{/* owner tag removed */}
											</>
										)}
									</div>
									<div className="flex items-center gap-2">
										{"virtual" in b ? null : (
											<>
												<Button
													aria-label="Edit budget"
													onClick={() => setEditOpen(b.id)}
													size="icon-sm"
													variant="secondary"
												>
													<Pencil className="size-4" />
												</Button>
												<Button
													aria-label="Delete budget"
													onClick={() => {
														if (confirm("Delete this budget?"))
															deleteMut.mutate(b.id)
													}}
													size="icon-sm"
													variant="secondary"
												>
													<Trash2 className="size-4" />
												</Button>
											</>
										)}
									</div>
								</div>
								<div className="text-sm">
									<span className="font-medium">
										{b.displayCurrency}{" "}
										{b.amountDisplay.toLocaleString(undefined, {
											maximumFractionDigits: 2,
										})}
									</span>
									<span className="text-muted-foreground"> · Spent </span>
									<span>
										{b.displayCurrency} {b.spentDisplay.toFixed(2)}
									</span>
								</div>
								<ProgressBar percent={b.utilizationPct} />
							</div>
						))}
					</div>
				)}

				{/* Create dialog */}
				<BudgetDialog
					disabledValues={disabledForCreate}
					initial={createInitial}
					onOpenChange={setCreateOpen}
					onSubmit={(state) => {
						createMut.mutate({
							amount: state.amount as number,
							currency: state.currency,
							categories: state.categories,
						})
						setCreateOpen(false)
					}}
					open={createOpen}
					submitLabel={createMut.isPending ? "Creating..." : "Create"}
					title="New Budget"
				/>

				{/* Edit dialog */}
				<BudgetDialog
					disabledValues={disabledForEdit}
					initial={editInitial}
					onOpenChange={(v) => setEditOpen(v ? editOpen : null)}
					onSubmit={(state) => {
						if (!editOpen) return
						updateMut.mutate({
							id: editOpen,
							amount: state.amount as number,
							currency: state.currency,
							categories: state.categories,
						})
						setEditOpen(null)
					}}
					open={!!editOpen}
					submitLabel={updateMut.isPending ? "Saving..." : "Save"}
					title="Edit Budget"
				/>
			</CardContent>
		</Card>
	)
}
