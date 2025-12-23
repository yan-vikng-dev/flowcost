import { createFileRoute, Outlet } from "@tanstack/react-router"
import { GoogleLogin } from "@/components/auth/google-login"
import { FloatingWaves } from "@/components/bg/floating-waves"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { authClient } from "@/lib/auth-client"
import { OnboardingTourProvider } from "@/onboarding/provider"
import { DesktopAppNav } from "./-components/desktop-nav"
import { MobileAppNav } from "./-components/mobile-nav"

export const Route = createFileRoute("/_auth")({
	component: RouteComponent,
})

function RouteComponent() {
	const session = authClient.useSession()
	const isDesktop = useIsDesktop()

	return (
		<div>
			<FloatingWaves
				disableInteraction
				lineColor="rgba(59, 130, 246, 0.1)"
				secondaryWaveSpeedX={0.01}
				secondaryWaveSpeedY={0.008}
				waveAmpX={18}
				waveAmpY={35}
				waveSpeedX={0.0015}
				waveSpeedY={0.0015}
			/>
			{session.isPending && (
				<div className="flex min-h-screen items-center justify-center bg-background">
					<img
						alt="Flowcost"
						className="h-16 w-16 animate-spin rounded-full object-cover"
						height={64}
						sizes="64px"
						src="/logo/logo-bg-128.webp"
						srcSet="/logo/logo-bg-64.webp 1x, /logo/logo-bg-128.webp 2x"
						width={64}
					/>
				</div>
			)}
			{!session.isPending && !session.data && <GoogleLogin />}
			{!session.isPending && session.data && (
				<OnboardingTourProvider>
					{isDesktop && <DesktopAppNav />}
					<main className="z-10 mt-0 mb-16 px-4 py-6 md:mt-16 md:mb-0">
						<Outlet />
					</main>
					{!isDesktop && <MobileAppNav />}
				</OnboardingTourProvider>
			)}
		</div>
	)
}
