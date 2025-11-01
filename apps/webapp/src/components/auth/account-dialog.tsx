import { initialsFrom } from "@repo/shared-config"
import { LogOut, Palette } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { authClient } from "@/lib/auth-client"

interface AccountDialogProps {
	children: React.ReactNode
}

export function AccountDialog({ children }: AccountDialogProps) {
	const { data: session } = authClient.useSession()

	const signOut = () => {
		void authClient.signOut()
	}

	if (!session) {
		return null
	}

	const user = session.user
	const fallbackText = initialsFrom(user.name ?? user.email).slice(0, 1) || "U"

	return (
		<Dialog>
			<DialogTrigger asChild>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader className="pb-4 text-center">
					<DialogTitle>Account</DialogTitle>
				</DialogHeader>
				<div className="flex flex-col items-center space-y-6 py-6">
					<Avatar className="h-20 w-20">
						<AvatarImage
							alt={user.name || "User"}
							src={user.image || undefined}
						/>
						<AvatarFallback className="font-semibold text-2xl">
							{fallbackText}
						</AvatarFallback>
					</Avatar>
					<div className="space-y-1 text-center">
						{user.name && (
							<div className="font-semibold text-lg">{user.name}</div>
						)}
						{user.email && (
							<div className="text-muted-foreground text-sm">{user.email}</div>
						)}
					</div>
					<div className="mt-6 flex w-full flex-col gap-4">
						<div className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3">
							<span className="flex items-center gap-2 font-medium text-sm">
								<Palette className="h-4 w-4" />
								Theme
							</span>
							<ThemeToggle />
						</div>
						<Button
							className="w-full gap-2"
							onClick={signOut}
							size="lg"
							variant="outline"
						>
							<LogOut className="h-5 w-5" />
							Sign Out
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
