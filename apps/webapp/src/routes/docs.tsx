import {
	createFileRoute,
	Link,
	Outlet,
	useRouter,
	useRouterState,
} from "@tanstack/react-router"
import {
	BarChart3Icon,
	BookOpenIcon,
	ChevronDownIcon,
	CommandIcon,
	DotIcon,
	ListChecksIcon,
	RocketIcon,
	SearchIcon,
	UsersIcon,
} from "lucide-react"
import * as React from "react"
import { FloatingWaves } from "@/components/bg/floating-waves"
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { LandingHeader } from "./-components/landing-header"

export const Route = createFileRoute("/docs")({
	component: DocsLayout,
})

type TocItem = {
	label: string
	href: string
}

type TocSection = {
	title: string
	items: TocItem[]
}

const tocMap: Record<string, TocSection[]> = {
	"/docs": [
		{
			title: "On this page",
			items: [
				{ label: "Overview", href: "#overview" },
				{ label: "Quick links", href: "#quick-links" },
			],
		},
	],
	"/docs/getting-started": [
		{
			title: "On this page",
			items: [
				{ label: "Start chatting", href: "#start-chatting" },
				{ label: "First entry", href: "#first-entry" },
				{ label: "Reports", href: "#reports" },
			],
		},
	],
	"/docs/features/entries": [
		{
			title: "On this page",
			items: [
				{ label: "What an entry stores", href: "#entry-model" },
				{ label: "Logging via WhatsApp", href: "#entry-logging" },
			],
		},
	],
	"/docs/features/reports": [
		{
			title: "On this page",
			items: [
				{ label: "Always-on schedule", href: "#report-schedule" },
				{ label: "What reports include", href: "#report-contents" },
			],
		},
	],
	"/docs/features/connections": [
		{
			title: "On this page",
			items: [
				{ label: "Pairing via /pair", href: "#pairing" },
				{ label: "Limits and unpairing", href: "#connection-limits" },
			],
		},
	],
}

const navGroupClasses =
	"rounded-xl border border-border/40 bg-card/40 shadow-sm backdrop-blur"

const navLinkBase =
	"block rounded-md px-2 py-1 text-sm transition hover:bg-accent/50"

const navLinkMuted = "text-muted-foreground hover:text-foreground"

const navLinkActive = "bg-accent/60 text-foreground"

const docsSearchItems = [
	{
		title: "Docs overview",
		description: "Core concepts and quick links.",
		href: "/docs",
		group: "Overview",
		icon: BookOpenIcon,
	},
	{
		title: "Getting started",
		description: "Message Flowcost, log your first expense, and get reports.",
		href: "/docs/getting-started",
		group: "Overview",
		icon: RocketIcon,
	},
	{
		title: "Entries",
		description: "How expenses are stored and logged in chat.",
		href: "/docs/features/entries",
		group: "Features",
		icon: ListChecksIcon,
	},
	{
		title: "Reports",
		description: "Automatic weekly and monthly WhatsApp summaries.",
		href: "/docs/features/reports",
		group: "Features",
		icon: BarChart3Icon,
	},
	{
		title: "Connections",
		description: "Pair with a partner using /pair and /accept.",
		href: "/docs/features/connections",
		group: "Features",
		icon: UsersIcon,
	},
] as const

const searchGroups = ["Overview", "Features"]

function DocsLayout() {
	const router = useRouter()
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})
	const [isMac, setIsMac] = React.useState(false)
	const searchRef = React.useRef<HTMLInputElement | null>(null)
	const [isSearchOpen, setIsSearchOpen] = React.useState(false)
	const [searchQuery, setSearchQuery] = React.useState("")

	React.useEffect(() => {
		if (typeof navigator === "undefined") return
		setIsMac(/Mac|iPhone|iPad|iPod/.test(navigator.platform))
	}, [])

	React.useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			const isTrigger = isMac ? event.metaKey : event.ctrlKey
			if (!isTrigger || event.key.toLowerCase() !== "k") return
			event.preventDefault()
			searchRef.current?.focus()
			setIsSearchOpen(true)
		}

		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [isMac])

	const tocSections = tocMap[pathname] ?? []

	const linkClass = (to: string) =>
		cn(navLinkBase, pathname === to ? navLinkActive : navLinkMuted)

	return (
		<div className="relative min-h-screen overflow-hidden bg-linear-to-b from-background via-background/95 to-primary/10">
			<FloatingWaves
				className="z-0"
				isPaused
				lineColor="rgba(59, 130, 246, 0.14)"
				secondaryWaveSpeedX={0.012}
				waveAmpX={30}
				waveAmpY={16}
				waveSpeedX={0.006}
				waveSpeedY={0.006}
			/>
			<LandingHeader />
			<main className="relative z-10">
				<section className="container mx-auto flex flex-col gap-10 px-4 pt-24 pb-20 sm:px-6 lg:px-8">
					<div className="space-y-3">
						<h1 className="flex items-center gap-3 text-balance font-semibold text-3xl tracking-tight sm:text-4xl lg:text-5xl">
							<BookOpenIcon className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
							Flowcost docs
						</h1>
						<p className="max-w-2xl text-sm sm:text-base">
							Guides for logging expenses, pairing with a partner, and
							understanding your WhatsApp reports.
						</p>
					</div>

					<div className="grid gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)_minmax(0,14rem)]">
						<aside className="lg:sticky lg:top-24">
							<div className={navGroupClasses}>
								<div className="border-border/40 border-b px-4 py-3">
									<p className="font-semibold text-foreground text-sm">Docs</p>
									<p className="text-muted-foreground text-xs">
										Overview and feature guides
									</p>
								</div>
								<div className="px-3 pt-3">
									<div className="relative">
										<SearchIcon className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
										<Input
											className="pr-20 pl-9"
											onChange={(event) => {
												setSearchQuery(event.target.value)
												setIsSearchOpen(true)
											}}
											onFocus={() => setIsSearchOpen(true)}
											placeholder="Search docs..."
											ref={searchRef}
											value={searchQuery}
										/>
										<div className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3">
											<Kbd className="gap-1">
												{isMac ? (
													<>
														<CommandIcon className="h-3 w-3" />
														<span>K</span>
													</>
												) : (
													<>
														<span>Ctrl</span>
														<span>K</span>
													</>
												)}
											</Kbd>
										</div>
									</div>
								</div>
								<ScrollArea className="max-h-[60vh] px-2 py-3">
									<div className="space-y-3">
										<Collapsible defaultOpen>
											<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left font-medium text-foreground text-sm transition hover:bg-accent/50">
												Overview
												<ChevronDownIcon className="h-4 w-4 text-muted-foreground transition data-[state=open]:rotate-180" />
											</CollapsibleTrigger>
											<CollapsibleContent className="mt-2 space-y-1 pl-4">
												<Link className={linkClass("/docs")} to="/docs">
													<span className="flex items-center gap-2">
														<BookOpenIcon className="h-4 w-4 text-primary" />
														Docs overview
													</span>
												</Link>
												<Link
													className={linkClass("/docs/getting-started")}
													to="/docs/getting-started"
												>
													<span className="flex items-center gap-2">
														<RocketIcon className="h-4 w-4 text-primary" />
														Getting started
													</span>
												</Link>
											</CollapsibleContent>
										</Collapsible>

										<Collapsible defaultOpen>
											<CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1 text-left font-medium text-foreground text-sm transition hover:bg-accent/50">
												Features
												<ChevronDownIcon className="h-4 w-4 text-muted-foreground transition data-[state=open]:rotate-180" />
											</CollapsibleTrigger>
											<CollapsibleContent className="mt-2 space-y-1 pl-4">
												<Link
													className={linkClass("/docs/features/entries")}
													to="/docs/features/entries"
												>
													<span className="flex items-center gap-2">
														<ListChecksIcon className="h-4 w-4 text-primary" />
														Entries
													</span>
												</Link>
												<Link
													className={linkClass("/docs/features/reports")}
													to="/docs/features/reports"
												>
													<span className="flex items-center gap-2">
														<BarChart3Icon className="h-4 w-4 text-primary" />
														Reports
													</span>
												</Link>
												<Link
													className={linkClass("/docs/features/connections")}
													to="/docs/features/connections"
												>
													<span className="flex items-center gap-2">
														<UsersIcon className="h-4 w-4 text-primary" />
														Connections
													</span>
												</Link>
											</CollapsibleContent>
										</Collapsible>
									</div>
								</ScrollArea>
							</div>
						</aside>

						<div className="min-w-0">
							<Outlet />
						</div>

						<aside className="hidden lg:block">
							<div className={cn(navGroupClasses, "px-4 py-4")}>
								{tocSections.length === 0 ? (
									<p className="text-muted-foreground text-xs">
										Select a page to see its outline.
									</p>
								) : (
									<div className="space-y-4">
										{tocSections.map((section) => (
											<div className="space-y-2" key={section.title}>
												<p className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
													{section.title}
												</p>
												<div className="space-y-2">
													{section.items.map((item) => (
														<a
															className="flex items-center gap-2 text-muted-foreground text-sm transition hover:text-foreground"
															href={item.href}
															key={item.href}
														>
															<DotIcon className="h-3 w-3" />
															{item.label}
														</a>
													))}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</aside>
					</div>
				</section>
			</main>
			<CommandDialog
				onOpenChange={(open) => {
					setIsSearchOpen(open)
					if (!open) setSearchQuery("")
				}}
				open={isSearchOpen}
				title="Search docs"
			>
				<CommandInput
					autoFocus
					onValueChange={setSearchQuery}
					placeholder="Search docs..."
					value={searchQuery}
				/>
				<CommandList>
					<CommandEmpty>No results found.</CommandEmpty>
					{searchGroups.map((group) => (
						<CommandGroup heading={group} key={group}>
							{docsSearchItems
								.filter((item) => item.group === group)
								.map((item) => (
									<CommandItem
										key={item.href}
										onSelect={() => {
											setIsSearchOpen(false)
											setSearchQuery("")
											router.navigate({ to: item.href })
										}}
									>
										<div className="flex items-start gap-3">
											<item.icon className="mt-0.5 h-4 w-4 text-primary" />
											<div className="flex flex-col gap-1">
												<span>{item.title}</span>
												<span className="text-muted-foreground text-xs">
													{item.description}
												</span>
											</div>
										</div>
									</CommandItem>
								))}
						</CommandGroup>
					))}
				</CommandList>
			</CommandDialog>
		</div>
	)
}
