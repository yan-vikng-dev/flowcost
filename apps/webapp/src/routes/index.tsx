import { createFileRoute } from "@tanstack/react-router";
import { HeroSection } from "./-components/hero-section";
import { NavigationBar } from "./-components/navigation-bar";

export const Route = createFileRoute("/")({
	component: LandingPage,
});

function LandingPage() {
	return (
		<div className="min-h-screen bg-background">
			<NavigationBar />
			<main>
				<HeroSection />
			</main>
		</div>
	);
}
