import { Link } from "@tanstack/react-router"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { UserAvatar } from "@/components/user-avatar"
import {
	hasIncomingInvites,
	useConnectionState,
} from "@/hooks/use-connection-state"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

export function DesktopAppNav() {
	const { data: session } = authClient.useSession()
	const [isScrolled, setIsScrolled] = React.useState(false)

	const user = session?.user

	const connectionStateQuery = useConnectionState()
	const hasIncoming = hasIncomingInvites(connectionStateQuery)

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 0)
		}

		handleScroll()
		window.addEventListener("scroll", handleScroll, { passive: true })
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<header
			className={cn(
				"fixed top-0 z-20 flex h-16 w-full items-center justify-between border-b px-6 transition-all duration-300",
				isScrolled
					? "border-border/50 bg-background/80 backdrop-blur-xl"
					: "border-transparent bg-transparent",
			)}
		>
			<Link to="/app">
				<img
					alt="Flowcost"
					className="size-8 rounded-full object-cover"
					height={32}
					sizes="32px"
					src="/logo/logo-bg-128.webp"
					srcSet="/logo/logo-bg-64.webp 1x, /logo/logo-bg-128.webp 2x"
					width={32}
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
