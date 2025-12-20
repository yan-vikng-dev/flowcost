import { CheckCircle2Icon, CircleIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import type { OnboardingStatus } from "@/core/functions/onboarding"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { useOnboardingTour } from "./provider"
import {
	completionByStep,
	getFirstIncompleteStep,
	type OnboardingStepId,
	onboardingSteps,
} from "./steps"

type ChecklistItemProps = {
	label: string
	isDone: boolean
	isActive: boolean
	onClick: () => void
}

function ChecklistItem({
	label,
	isDone,
	isActive,
	onClick,
}: ChecklistItemProps) {
	return (
		<button
			className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors ${
				isActive ? "bg-muted/70" : "hover:bg-muted/50"
			}`}
			onClick={onClick}
			type="button"
		>
			{isDone ? (
				<CheckCircle2Icon className="size-5 text-emerald-500" />
			) : (
				<CircleIcon className="size-5 text-muted-foreground" />
			)}
			<span
				className={
					isDone ? "text-muted-foreground line-through" : "font-medium"
				}
			>
				{label}
			</span>
		</button>
	)
}

function ChecklistBody({
	onSelectStep,
	selectedStepId,
	onDismiss,
	status,
}: {
	onSelectStep: (id: OnboardingStepId) => void
	selectedStepId: OnboardingStepId | null
	onDismiss: () => void
	status: OnboardingStatus
}) {
	const ordered = onboardingSteps.map((step) => step.id)

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
					<p className="font-semibold text-sm">Bob&apos;s setup checklist</p>
				<Button onClick={onDismiss} size="icon-sm" variant="ghost">
					<XIcon className="size-4" />
				</Button>
			</div>
			<Separator />
			<div className="space-y-1">
				{ordered.map((stepId) => {
					const step = onboardingSteps.find(
						(candidate) => candidate.id === stepId,
					)
					if (!step) return null
					const isDone = Boolean(status[completionByStep[step.id]])
					return (
						<ChecklistItem
							isActive={selectedStepId === step.id}
							isDone={isDone}
							key={step.id}
							label={step.checklistLabel}
							onClick={() => onSelectStep(step.id)}
						/>
					)
				})}
			</div>
			<Separator />
			<div className="flex items-center justify-between gap-2">
				<Button
					onClick={() => onSelectStep(getFirstIncompleteStep(status))}
					size="sm"
					variant="secondary"
				>
					Next focus
				</Button>
				<Button onClick={onDismiss} size="sm" variant="ghost">
					Dismiss tour
				</Button>
			</div>
		</div>
	)
}

export function OnboardingChecklist() {
	const {
		status,
		isChecklistOpen,
		setChecklistOpen,
		selectStep,
		selectedStepId,
		dismissTour,
	} = useOnboardingTour()
	const isDesktop = useIsDesktop()

	React.useEffect(() => {
		if (isChecklistOpen && status && !selectedStepId) {
			selectStep(getFirstIncompleteStep(status))
		}
	}, [isChecklistOpen, selectStep, selectedStepId, status])

	if (!status?.isMissingSetup || !isChecklistOpen) return null

	const checklist = (
		<ChecklistBody
			onDismiss={() => {
				dismissTour()
				setChecklistOpen(false)
			}}
			onSelectStep={(stepId) => {
				selectStep(stepId)
				setChecklistOpen(true)
			}}
			selectedStepId={selectedStepId}
			status={status}
		/>
	)

	if (isDesktop) {
		return (
			<Card className="fixed right-4 bottom-4 z-50 w-80 shadow-lg">
				<CardContent>{checklist}</CardContent>
			</Card>
		)
	}

	return (
		<Sheet
			onOpenChange={(open) => {
				if (!open) {
					dismissTour()
				}
				setChecklistOpen(open)
			}}
			open={isChecklistOpen}
		>
			<SheetContent className="p-0" side="bottom">
				{checklist}
			</SheetContent>
		</Sheet>
	)
}
