import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import {
	hasIncomingInvites,
	useConnectionState,
} from "@/hooks/use-connection-state"
import { authClient } from "@/lib/auth-client"

export function Header() {
	const { data: session } = authClient.useSession()

	const user = session?.user

	const connectionStateQuery = useConnectionState()
	const hasIncoming = hasIncomingInvites(connectionStateQuery)

	return (
		<header className="flex h-16 items-center justify-between border-border border-b bg-background px-6">
			{/* Left side - Logo */}
			<div className="flex items-center gap-2">
				<Link to="/app">
					<img alt="Flowcost" className="size-12" src="/logo/logo192.png" />
				</Link>
			</div>

			{/* Right side - Settings, Notifications and user menu */}
			<div className="flex items-center gap-2">
				<Button asChild variant="ghost">
					<Link to="/app">Dashboard</Link>
				</Button>
				<Button asChild variant="ghost">
					<Link to="/app/advanced">Advanced</Link>
				</Button>
				<div className="relative">
					<Button asChild variant="ghost">
						<Link to="/app/settings">Settings</Link>
					</Button>
					{hasIncoming && (
						<div className="absolute top-1 right-0 size-2 rounded-full bg-destructive" />
					)}
				</div>

				{user && <UserAvatar className="h-8 w-8" user={user} />}
			</div>
		</header>
	)
}
