import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { AccountDialog } from "@/components/auth/account-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { getConnectionState } from "@/routes/_auth/app/settings/-functions/connections"

export function Header() {
	const { data: session } = authClient.useSession()

	const user = session?.user
	const fallbackText = user?.name
		? user.name.charAt(0).toUpperCase()
		: user?.email?.charAt(0).toUpperCase() || "U"

	const connectionStateQuery = useQuery({
		queryKey: ["connectionState"],
		queryFn: () => getConnectionState(),
		staleTime: 30_000,
	})

	const hasIncomingInvites =
		connectionStateQuery.data?.pending?.some(
			(inv) => inv.direction === "incoming",
		) ?? false

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
					{hasIncomingInvites && (
						<div className="absolute top-1 right-0 size-2 rounded-full bg-destructive" />
					)}
				</div>

				<AccountDialog>
					<Button className="flex items-center gap-2 px-3" variant="ghost">
						<Avatar className="h-8 w-8">
							<AvatarImage
								alt={user?.name || "User"}
								src={user?.image || undefined}
							/>
							<AvatarFallback className="bg-primary text-primary-foreground text-sm">
								{fallbackText}
							</AvatarFallback>
						</Avatar>
						<div className="hidden flex-col items-start sm:flex">
							<span className="font-medium text-sm">
								{user?.name || "User"}
							</span>
							<span className="text-muted-foreground text-xs">Online</span>
						</div>
					</Button>
				</AccountDialog>
			</div>
		</header>
	)
}
