import { Link } from "@tanstack/react-router"
import { Loader2Icon, LogInIcon } from "lucide-react"
import * as React from "react"
import { ThemeToggle } from "@/components/theme"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

export function LandingHeader() {
	const [isScrolled, setIsScrolled] = React.useState(false)
	const [isLoading, setIsLoading] = React.useState(false)

	const handleGoogleSignIn = async () => {
		setIsLoading(true)
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: "/app",
			})
		} catch {
			setIsLoading(false)
		}
	}

	React.useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 20)
		}

		window.addEventListener("scroll", handleScroll)
		return () => window.removeEventListener("scroll", handleScroll)
	}, [])

	return (
		<nav
			className={cn(
				"fixed top-0 right-0 left-0 z-50 border-b transition-all duration-500 ease-out",
				isScrolled
					? "border-border/50 bg-background/80 shadow-lg shadow-primary/5 backdrop-blur-xl"
					: "border-transparent bg-transparent",
			)}
		>
			<div className="container mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex h-16 items-center justify-between">
					<Link to="/">
						<div className="flex items-center gap-2">
							<img
								alt="Flowcost"
								className="size-12 rounded-full object-cover"
								height={48}
								sizes="48px"
								src="/logo/logo-bg-128.webp"
								srcSet="/logo/logo-bg-64.webp 1x, /logo/logo-bg-128.webp 2x"
								width={48}
							/>
							<span className="bg-linear-to-r from-primary to-foreground bg-clip-text font-bold text-lg text-transparent transition-all duration-300 hover:from-foreground hover:to-primary lg:text-xl">
								Flowcost
							</span>
						</div>
					</Link>

					<div className="flex items-center gap-2">
						<Button asChild variant="outline">
							<Link to="/docs">Docs</Link>
						</Button>
						<Button asChild variant="outline">
							<Link to="/pricing">Pricing</Link>
						</Button>
						<Button
							className="gap-2"
							disabled={isLoading}
							onClick={() => void handleGoogleSignIn()}
						>
							{isLoading ? (
								<Loader2Icon className="h-4 w-4 animate-spin" />
							) : (
								<LogInIcon className="h-4 w-4" />
							)}
							Sign In
						</Button>
						<ThemeToggle />
					</div>
				</div>
			</div>
		</nav>
	)
}
