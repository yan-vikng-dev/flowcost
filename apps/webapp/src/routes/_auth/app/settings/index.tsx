import { createFileRoute } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { getUserPreferences } from "@/core/functions/preferences"
import { getWhatsappLinkStatus } from "@/core/functions/whatsapp"
import { useOnboardingTour } from "@/onboarding/provider"
import { AccountCard } from "./-components/AccountCard"
import { AssistantCard } from "./-components/AssistantCard"
import { DangerZoneCard } from "./-components/danger-zone-card"
import { IncomingInviteCard } from "./-components/incoming-invite-card"
import { PreferencesCard } from "./-components/preferences-card"

export const Route = createFileRoute("/_auth/app/settings/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData({
				queryKey: ["userPreferences"],
				queryFn: () => getUserPreferences(),
			}),
			context.queryClient.ensureQueryData({
				queryKey: ["whatsappLinkStatus"],
				queryFn: () => getWhatsappLinkStatus(),
			}),
			context.queryClient.ensureQueryData({
				queryKey: ["connectionState"],
				queryFn: async () => {
					const mod = await import("./-functions/connections")
					return mod.getConnectionState()
				},
			}),
		])
	},
	component: RouteComponent,
})

function ResumeOnboardingCard() {
	const { status, startTour, setChecklistOpen } = useOnboardingTour()

	if (!status?.isMissingSetup) return null

	return (
		<Card data-onboarding="resume-onboarding">
			<CardHeader>
				<CardTitle>Resume onboarding</CardTitle>
				<CardDescription>
					Bob can pick up where you left off. You can always close the tour
					again if you need space.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Button
					onClick={() => {
						startTour()
						setChecklistOpen(true)
					}}
				>
					Open the tour
				</Button>
			</CardContent>
		</Card>
	)
}

function RouteComponent() {
	return (
		<div className="mx-auto grid max-w-xl gap-6">
			<ResumeOnboardingCard />
			<IncomingInviteCard />
			<AccountCard />
			<PreferencesCard />
			<AssistantCard />
			<DangerZoneCard />
		</div>
	)
}
