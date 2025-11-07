import { Check, Monitor, Moon, Sun } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "./theme-provider"

export function ThemeToggle() {
	const { theme, setTheme, resolvedTheme } = useTheme()

	const iconVariants = {
		sun: "transition-all duration-500 ease-in-out",
		moon: "transition-all duration-500 ease-in-out",
		system: "transition-all duration-300 ease-in-out",
	}

	const getCurrentIcon = () => {
		if (theme === "system") {
			return (
				<Monitor
					aria-hidden="true"
					className={`${iconVariants.system} rotate-0 scale-100`}
				/>
			)
		}
		if (resolvedTheme === "dark") {
			return (
				<Moon
					aria-hidden="true"
					className={`${iconVariants.moon} rotate-0 scale-100`}
				/>
			)
		}
		return (
			<Sun
				aria-hidden="true"
				className={`${iconVariants.sun} rotate-0 scale-100`}
			/>
		)
	}

	const themeOptions = [
		{
			value: "light",
			label: "Light",
			icon: Sun,
		},
		{
			value: "dark",
			label: "Dark",
			icon: Moon,
		},
		{
			value: "system",
			label: "System",
			icon: Monitor,
		},
	] as const

	const handleThemeSelect = (newTheme: typeof theme) => {
		setTheme(newTheme)
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					aria-label="Toggle theme"
					className="relative overflow-hidden transition-all duration-200 ease-in-out hover:scale-105 focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-95"
					size="icon"
					variant="outline"
				>
					<div className="relative flex items-center justify-center">
						{getCurrentIcon()}
					</div>
					<span className="sr-only">
						Current theme:{" "}
						{theme === "system" ? `System (${resolvedTheme})` : theme}
					</span>
				</Button>
			</DropdownMenuTrigger>

			<DropdownMenuContent
				align="end"
				className="w-56 border border-border/50 bg-popover/95 p-2 shadow-lg backdrop-blur-sm"
			>
				<div className="grid gap-1">
					{themeOptions.map((option) => {
						const Icon = option.icon
						const isSelected = theme === option.value

						return (
							<DropdownMenuItem
								className={`group flex cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 transition-all duration-200 ease-in-out hover:bg-accent/80 focus:bg-accent/80 ${
									isSelected ? "bg-accent/60 text-accent-foreground" : ""
								}`}
								key={option.value}
								onClick={() => handleThemeSelect(option.value)}
							>
								<div className="flex h-5 w-5 items-center justify-center">
									<Icon
										className={`h-4 w-4 transition-all duration-200 ${
											isSelected
												? "scale-110 text-accent-foreground"
												: "text-muted-foreground"
										} group-hover:scale-105`}
									/>
								</div>

								<div className="flex min-w-0 flex-1 items-center">
									<span
										className={`font-medium text-sm ${
											isSelected ? "text-accent-foreground" : "text-foreground"
										}`}
									>
										{option.label}
									</span>
								</div>

								{isSelected && (
									<Check className="fade-in-0 zoom-in-75 h-4 w-4 animate-in text-accent-foreground duration-150" />
								)}
							</DropdownMenuItem>
						)
					})}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}

// Simplified version for minimal use cases
export function ThemeToggleSimple() {
	const { theme, setTheme, resolvedTheme } = useTheme()

	const handleToggle = () => {
		if (theme === "light") {
			setTheme("dark")
		} else if (theme === "dark") {
			setTheme("system")
		} else {
			setTheme("light")
		}
	}

	return (
		<Button
			aria-label={`Switch to ${theme === "light" ? "dark" : theme === "dark" ? "system" : "light"} theme`}
			className={`relative aspect-square overflow-hidden transition-all duration-200 ease-in-out hover:scale-105 focus:ring-2 focus:ring-ring focus:ring-offset-2 active:scale-95`}
			onClick={handleToggle}
			size="default"
			variant="ghost"
		>
			<div className="relative flex items-center justify-center">
				{theme === "system" && (
					<Monitor className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 ease-in-out" />
				)}
				{resolvedTheme === "dark" && theme !== "system" && (
					<Moon className="h-4 w-4 rotate-0 scale-100 transition-all duration-500 ease-in-out" />
				)}
				{resolvedTheme === "light" && theme !== "system" && (
					<Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-500 ease-in-out" />
				)}
			</div>
			<span className="sr-only">
				Current theme:{" "}
				{theme === "system" ? `System (${resolvedTheme})` : theme}
			</span>
		</Button>
	)
}
