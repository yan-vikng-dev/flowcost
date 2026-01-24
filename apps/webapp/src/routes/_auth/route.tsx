import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { FloatingWaves } from "@/components/bg/floating-waves"
import { checkAuthSession } from "@/server/check-auth-session"
import { DesktopAppNav } from "./-components/desktop-nav"
import { MobileAppNav } from "./-components/mobile-nav"

export const Route = createFileRoute("/_auth")({
	beforeLoad: async () => {
		const session = await checkAuthSession()
		if (!session) {
			throw redirect({ to: "/" })
		}
		return { session }
	},
	component: RouteComponent,
})

function RouteComponent() {
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
			<div className="hidden md:block">
				<DesktopAppNav />
			</div>
			<main className="z-10 mt-0 mb-16 px-4 py-6 md:mt-16 md:mb-0">
				<Outlet />
			</main>
			<div className="block md:hidden">
				<MobileAppNav />
			</div>
		</div>
	)
}
