import { createFileRoute, redirect } from "@tanstack/react-router"
import { checkAuthSession } from "@/server/check-auth-session"
import { HeroSection } from "./-components/hero-section"
import { NavigationBar } from "./-components/navigation-bar"

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const { hasSession } = await checkAuthSession()
		if (hasSession) {
			throw redirect({ to: "/app" })
		}
	},
	component: LandingPage,
})

function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			<NavigationBar />
			<main>
				<HeroSection />
			</main>
		</div>
	)
}
