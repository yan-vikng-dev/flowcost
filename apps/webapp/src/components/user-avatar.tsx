import { initialsFrom } from "@repo/shared-lib"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type User = {
	name?: string | null
	email?: string | null
	image?: string | null
}

type UserAvatarProps = {
	user: User
	className?: string
}

export function UserAvatar({ user, className }: UserAvatarProps) {
	const fallbackText = initialsFrom(user?.name ?? user?.email ?? "") || "U"
	const displayName = user?.name ?? user?.email ?? "User"

	return (
		<Avatar className={className}>
			<AvatarImage alt={displayName} src={user?.image || undefined} />
			<AvatarFallback className="bg-primary text-primary-foreground text-sm">
				{fallbackText}
			</AvatarFallback>
		</Avatar>
	)
}
