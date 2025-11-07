import { createFileRoute, Outlet } from "@tanstack/react-router"
import { GoogleLogin } from "@/components/auth/google-login"
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
				<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
			</div>
		)
	}
	if (!session.data) {
		return <GoogleLogin />
	}

	return (
		<div className="flex-col">
			<AppHeader />
			<main className="p-4 pt-16 sm:p-6 lg:p-8">
				<Outlet />
			</main>
		</div>
	)
}
