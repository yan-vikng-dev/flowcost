import { Link } from "@tanstack/react-router"
import { BellIcon } from "lucide-react"
import { AccountDialog } from "@/components/auth/account-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function Header() {
	const { data: session } = authClient.useSession()

	const user = session?.user
	const fallbackText = user?.name
		? user.name.charAt(0).toUpperCase()
		: user?.email?.charAt(0).toUpperCase() || "U"

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
					<Link to="/app/settings/preferences">Settings</Link>
				</Button>
				<Button className="relative" size="icon" variant="ghost">
					<BellIcon className="h-5 w-5" />
					{/* <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-destructive"></span> */}
				</Button>

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
