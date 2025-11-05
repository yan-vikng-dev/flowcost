import { createFileRoute, redirect } from "@tanstack/react-router"
import { FloatingWaves } from "@/components/bg/floating-waves"
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
		<div className="relative min-h-screen overflow-hidden bg-linear-to-br from-background via-background/95 to-primary/5">
			<FloatingWaves
				className="z-0"
				lineColor="rgba(59, 130, 246, 0.15)"
				waveAmpX={35}
				waveAmpY={18}
				waveSpeedX={0.012}
				waveSpeedY={0.006}
			/>
			<NavigationBar />
			<main className="relative z-10">
				<HeroSection />
			</main>
		</div>
	)
}
