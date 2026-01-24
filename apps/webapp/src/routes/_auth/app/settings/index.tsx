import { createFileRoute } from "@tanstack/react-router"
import { getUserPreferences } from "@/core/functions/preferences"
import { getWhatsappLinkStatus } from "@/core/functions/whatsapp"
import { AccountCard } from "./-components/AccountCard"
import { AssistantCard } from "./-components/AssistantCard"
import { DangerZoneCard } from "./-components/danger-zone-card"
import { IncomingInviteCard } from "./-components/incoming-invite-card"
import { OnboardingChecklistSetting } from "./-components/onboarding-checklist-setting"
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

function RouteComponent() {
	return (
		<div className="mx-auto grid max-w-xl gap-6">
			<OnboardingChecklistSetting />
			<IncomingInviteCard />
			<AccountCard />
			<PreferencesCard />
			<AssistantCard />
			<DangerZoneCard />
		</div>
	)
}
