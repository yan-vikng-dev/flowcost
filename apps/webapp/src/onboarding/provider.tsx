import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import {
	getOnboardingStatus,
	type OnboardingStatus,
} from "@/core/functions/onboarding"
import { OnboardingCallouts } from "./callouts"
import { OnboardingChecklist } from "./checklist"
import { getFirstIncompleteStep, type OnboardingStepId } from "./steps"
import { useOnboardingDismissal } from "./utils"
import { WelcomeDialog } from "./welcome-dialog"

const ONBOARDING_ENABLED =
	import.meta.env.VITE_ONBOARDING_TOUR_DISABLED !== "true"

type OnboardingTourContextType = {
	status: OnboardingStatus | undefined
	isLoading: boolean
	dismissedAt: number | null
	shouldShowWelcome: boolean
	isChecklistOpen: boolean
	selectedStepId: OnboardingStepId | null
	startTour: (stepId?: OnboardingStepId) => void
	selectStep: (stepId: OnboardingStepId | null) => void
	setChecklistOpen: (isOpen: boolean) => void
	dismissTour: () => void
	resetDismissal: () => void
}

const OnboardingTourContext = React.createContext<
	OnboardingTourContextType | undefined
>(undefined)

export function OnboardingTourProvider({
	children,
}: {
	children: React.ReactNode
}) {
	const {
		dismissedAt,
		dismiss: dismissInStorage,
		resetDismissal,
	} = useOnboardingDismissal()

	const { data: status, isLoading } = useQuery({
		queryKey: ["onboardingStatus"],
		queryFn: () => getOnboardingStatus(),
		staleTime: 5 * 60 * 1000,
		enabled: ONBOARDING_ENABLED,
	})

	const [selectedStepId, setSelectedStepId] =
		React.useState<OnboardingStepId | null>(null)
	const [isChecklistOpen, setIsChecklistOpen] = React.useState(false)

	const shouldShowWelcome = Boolean(
		ONBOARDING_ENABLED && status?.isMissingSetup && !dismissedAt,
	)

	const startTour = React.useCallback(
		(stepId?: OnboardingStepId) => {
			if (!ONBOARDING_ENABLED || !status?.isMissingSetup) return
			setIsChecklistOpen(true)
			setSelectedStepId(stepId ?? getFirstIncompleteStep(status))
		},
		[status],
	)

	const dismissTour = React.useCallback(() => {
		dismissInStorage()
		setIsChecklistOpen(false)
		setSelectedStepId(null)
	}, [dismissInStorage])

	React.useEffect(() => {
		if (!ONBOARDING_ENABLED || !status?.isMissingSetup) {
			setIsChecklistOpen(false)
			setSelectedStepId(null)
		}
	}, [status])

	const value = React.useMemo(
		() => ({
			status,
			isLoading: ONBOARDING_ENABLED ? isLoading : false,
			dismissedAt,
			shouldShowWelcome,
			isChecklistOpen,
			selectedStepId,
			startTour,
			selectStep: setSelectedStepId,
			setChecklistOpen: setIsChecklistOpen,
			dismissTour,
			resetDismissal,
		}),
		[
			status,
			isLoading,
			dismissedAt,
			shouldShowWelcome,
			isChecklistOpen,
			selectedStepId,
			startTour,
			dismissTour,
			resetDismissal,
		],
	)

	return (
		<OnboardingTourContext.Provider value={value}>
			<WelcomeDialog />
			<OnboardingChecklist />
			<OnboardingCallouts />
			{children}
		</OnboardingTourContext.Provider>
	)
}

export function useOnboardingTour() {
	const context = React.useContext(OnboardingTourContext)
	if (context === undefined) {
		throw new Error(
			"useOnboardingTour must be used within an OnboardingTourProvider",
		)
	}
	return context
}
