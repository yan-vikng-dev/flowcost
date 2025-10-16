import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Header } from "./-components/header";
import { GoogleLogin } from "@/components/auth/google-login";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
});

function RouteComponent() {
  const session = authClient.useSession();
  if (session.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
