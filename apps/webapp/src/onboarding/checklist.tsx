import { CheckCircle2Icon, CircleIcon, MinusIcon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { OnboardingStatus } from "@/core/functions/onboarding"
import { cn } from "@/lib/utils"
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
	onMinimize,
	status,
}: {
	onSelectStep: (id: OnboardingStepId) => void
	selectedStepId: OnboardingStepId | null
	onDismiss: () => void
	onMinimize: () => void
	status: OnboardingStatus
}) {
	const ordered = onboardingSteps.map((step) => step.id)

	return (
		<div className="flex flex-col gap-3 p-4">
			<div className="flex items-center justify-between">
				<p className="font-semibold text-sm">Bob&apos;s setup checklist</p>
				<div className="flex items-center gap-1">
					<Button
						onClick={(e) => {
							e.stopPropagation()
							onMinimize()
						}}
						size="icon-sm"
						variant="ghost"
					>
						<MinusIcon className="size-4" />
					</Button>
					<Button
						onClick={(e) => {
							e.stopPropagation()
							onDismiss()
						}}
						size="icon-sm"
						variant="ghost"
					>
						<XIcon className="size-4" />
					</Button>
				</div>
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
	const [isMinimized, setIsMinimized] = React.useState(false)

	React.useEffect(() => {
		if (isChecklistOpen && status && !selectedStepId) {
			selectStep(getFirstIncompleteStep(status))
		}
	}, [isChecklistOpen, selectStep, selectedStepId, status])

	if (!status?.isMissingSetup || !isChecklistOpen) return null

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: same container used for both states
		<div
			className={cn(
				"fixed right-4 bottom-4 z-50 flex flex-col overflow-hidden border bg-background shadow-lg transition-all duration-500 ease-in-out",

				isMinimized
					? "max-h-12 w-12 cursor-pointer rounded-3xl hover:scale-110 active:scale-95"
					: "max-h-[600px] w-80 rounded-xl",
			)}
			onClick={isMinimized ? () => setIsMinimized(false) : undefined}
			onKeyDown={
				isMinimized
					? (e) => {
							if (e.key === "Enter" || e.key === " ") {
								e.preventDefault()

								setIsMinimized(false)
							}
						}
					: undefined
			}
			tabIndex={isMinimized ? 0 : undefined}
		>
			<div
				className={cn(
					"absolute inset-0 flex items-center justify-center transition-opacity",

					isMinimized
						? "opacity-100 delay-500 duration-300"
						: "pointer-events-none opacity-0 delay-0 duration-0",
				)}
			>
				<img
					alt="Open checklist"
					className="h-12 w-12 object-cover"
					src="/logo/logo-bg-64.webp"
				/>
			</div>

			<div
				className={cn(
					"flex w-80 flex-col transition-opacity",

					isMinimized
						? "pointer-events-none opacity-0 delay-0 duration-0"
						: "opacity-100 delay-500 duration-300",
				)}
			>
				<ChecklistBody
					onDismiss={() => {
						dismissTour()

						setChecklistOpen(false)
					}}
					onMinimize={() => setIsMinimized(true)}
					onSelectStep={(stepId) => {
						selectStep(stepId)

						setChecklistOpen(true)
					}}
					selectedStepId={selectedStepId}
					status={status}
				/>
			</div>
		</div>
	)
}
