import { createFileRoute } from "@tanstack/react-router"
import { FloatingWaves } from "@/components/bg/floating-waves"
import { HeroSection } from "./-components/hero-section"
import { LandingHeader } from "./-components/landing-header"

export const Route = createFileRoute("/")({
	component: LandingPage,
})

function LandingPage() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-linear-to-br from-background via-background/95 to-primary/5">
			<FloatingWaves
				className="z-0"
				lineColor="rgba(59, 130, 246, 0.15)"
				secondaryWaveSpeedX={0.01}
				waveAmpX={35}
				waveAmpY={18}
				waveSpeedX={0.005}
				waveSpeedY={0.006}
			/>
			<LandingHeader />
			<main className="relative z-10">
				<HeroSection />
			</main>
		</div>
	)
}
