import { createFileRoute, Outlet } from "@tanstack/react-router"
import { GoogleLogin } from "@/components/auth/google-login"
import { FloatingWaves } from "@/components/bg/floating-waves"
import { authClient } from "@/lib/auth-client"
import { AppHeader } from "./-components/app-header"

export const Route = createFileRoute("/_auth")({
	component: RouteComponent,
})

function RouteComponent() {
	const session = authClient.useSession()
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
				className="-z-10"
				disableInteraction
				lineColor="rgba(59, 130, 246, 0.1)"
				waveAmpX={35}
				waveAmpY={18}
				waveSpeedX={0.006}
				waveSpeedY={0.003}
			/>
			<AppHeader />
			<main className="relative z-10 p-4 sm:p-6 lg:p-8">
				<Outlet />
			</main>
		</div>
	)
}
