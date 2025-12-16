import { Link } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import {
	hasIncomingInvites,
	useConnectionState,
} from "@/hooks/use-connection-state"
import { authClient } from "@/lib/auth-client"

export function DesktopAppNav() {
	const { data: session } = authClient.useSession()

	const user = session?.user

	const connectionStateQuery = useConnectionState()
	const hasIncoming = hasIncomingInvites(connectionStateQuery)

	return (
		<header className="fixed top-0 z-20 flex h-16 w-full items-center justify-between bg-background/80 px-6 backdrop-blur-xl">
			<Link to="/app">
				<img
					alt="Flowcost"
					className="size-8 rounded-full object-cover"
					src="/logo/logo320_bg.png"
				/>
			</Link>
			<div className="flex items-center gap-2">
				<Button asChild variant="outline">
					<Link to="/app">Dashboard</Link>
				</Button>
				<Button asChild variant="outline">
					<Link to="/app/advanced">Advanced</Link>
				</Button>
				<div className="relative">
					<Button asChild variant="outline">
						<Link to="/app/settings">Settings</Link>
					</Button>
					{hasIncoming && (
						<div className="absolute top-1 right-0 size-2 rounded-full bg-destructive" />
					)}
				</div>

				{user && (
					<Link to="/app/settings">
						<UserAvatar user={user} />
					</Link>
				)}
			</div>
		</header>
	)
}
