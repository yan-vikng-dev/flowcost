import { createFileRoute, Outlet } from "@tanstack/react-router"
import { GoogleLogin } from "@/components/auth/google-login"
import { FloatingWaves } from "@/components/bg/floating-waves"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { authClient } from "@/lib/auth-client"
import { DesktopAppNav } from "./-components/desktop-app-nav"
import { MobileAppNav } from "./-components/mobile-app-nav"

export const Route = createFileRoute("/_auth")({
	component: RouteComponent,
})

function RouteComponent() {
	const session = authClient.useSession()
	const isDesktop = useIsDesktop()
	if (session.isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<img
					alt="Flowcost"
					className="h-16 w-16 animate-spin rounded-full object-cover"
					src="/logo/logo320_bg.png"
				/>
			</div>
		)
	}
	if (!session.data) {
		return <GoogleLogin />
	}

	return (
		<div className="relative min-h-screen flex-col">
			<FloatingWaves
				disableInteraction
				lineColor="rgba(59, 130, 246, 0.1)"
				waveAmpX={18}
				waveAmpY={35}
				waveSpeedX={0.006}
				waveSpeedY={0.003}
			/>
			{isDesktop && <DesktopAppNav />}
			<main className="z-10 mt-0 mb-16 px-4 py-6 md:mt-16 md:mb-0">
				<Outlet />
			</main>
			{!isDesktop && <MobileAppNav />}
		</div>
	)
}
