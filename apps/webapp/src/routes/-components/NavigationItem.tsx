import { Link } from "@tanstack/react-router"
import { ExternalLinkIcon } from "lucide-react"
import type { MergedIconComponent } from "@/components/icons"

type NavigationItemProps = {
	label: string
	href: string
	isExternal?: boolean
	isDisabled?: boolean
	hideLabel?: boolean
	icon?: MergedIconComponent
	onClick?: () => void
	variant?: "desktop" | "mobile"
}

export function NavigationItem({
	label,
	href,
	isExternal,
	isDisabled,
	hideLabel,
	icon: Icon,
	onClick,
	variant = "desktop",
}: NavigationItemProps) {
	if (isDisabled) return null

	const baseClasses =
		variant === "desktop"
			? "group flex items-center gap-2 space-x-2 rounded-lg px-4 py-2 font-medium text-muted-foreground text-sm transition-all duration-300 hover:bg-accent/50 hover:text-foreground"
			: "flex w-full items-center justify-between rounded-lg px-4 py-3 font-medium text-muted-foreground text-sm transition-all duration-300 hover:bg-accent/50 hover:text-foreground"

	if (isExternal) {
		return (
			<a
				className={baseClasses}
				href={href}
				onClick={onClick}
				rel="noopener noreferrer"
				target="_blank"
			>
				{!hideLabel && <span>{label}</span>}
				{Icon && <Icon className="h-4 w-4" />}
				{isExternal && <ExternalLinkIcon className="h-4 w-4" />}
			</a>
		)
	}

	return (
		<Link className={baseClasses} onClick={onClick} to={href}>
			{!hideLabel && <span>{label}</span>}
			{Icon && <Icon className="h-4 w-4" />}
		</Link>
	)
}
