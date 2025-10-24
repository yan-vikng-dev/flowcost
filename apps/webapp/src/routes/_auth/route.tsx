import { createFileRoute, Outlet } from "@tanstack/react-router";
import { GoogleLogin } from "@/components/auth/google-login";
import { authClient } from "@/lib/auth-client";
import { Header } from "./-components/header";

export const Route = createFileRoute("/_auth")({
	component: RouteComponent,
});

function RouteComponent() {
	const session = authClient.useSession();
	if (session.isPending) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2"></div>
			</div>
		);
	}
	if (!session.data) {
		return <GoogleLogin />;
	}

	return (
		<div className="flex-col">
			<Header />
			<main className="p-8">
				<Outlet />
			</main>
		</div>
	);
}
