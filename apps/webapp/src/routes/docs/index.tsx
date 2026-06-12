import { createFileRoute, Link } from "@tanstack/react-router"
import {
	BarChart3Icon,
	BookOpenIcon,
	ListChecksIcon,
	RocketIcon,
	UsersIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

export const Route = createFileRoute("/docs/")({
	component: DocsIndexPage,
})

function DocsIndexPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<BookOpenIcon className="h-6 w-6 text-primary" />
					<h1 className="font-semibold text-3xl tracking-tight">
						Docs overview
					</h1>
				</div>
			</div>
			<section className="scroll-mt-28 space-y-4" id="overview">
				<h2 className="font-semibold text-2xl">Overview</h2>
				<div className="space-y-4 text-sm">
					<p>
						Flowcost is a WhatsApp-only expense tracker. Text expenses to the
						assistant, get automatic weekly and monthly reports, and optionally
						pair with a partner to combine spending views.
					</p>
					<p>
						There is no web dashboard or login — everything happens in chat. Use
						the links below to get started or learn how each feature works.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-4" id="quick-links">
				<h2 className="font-semibold text-2xl">Quick links</h2>
				<div className="grid gap-3 sm:grid-cols-2">
					<Button asChild className="justify-start" variant="outline">
						<Link
							className="flex items-center gap-2"
							to="/docs/getting-started"
						>
							<RocketIcon className="h-4 w-4 text-primary" />
							Getting started
						</Link>
					</Button>
					<Button asChild className="justify-start" variant="outline">
						<Link
							className="flex items-center gap-2"
							to="/docs/features/entries"
						>
							<ListChecksIcon className="h-4 w-4 text-primary" />
							Entries
						</Link>
					</Button>
					<Button asChild className="justify-start" variant="outline">
						<Link
							className="flex items-center gap-2"
							to="/docs/features/reports"
						>
							<BarChart3Icon className="h-4 w-4 text-primary" />
							Reports
						</Link>
					</Button>
					<Button asChild className="justify-start" variant="outline">
						<Link
							className="flex items-center gap-2"
							to="/docs/features/connections"
						>
							<UsersIcon className="h-4 w-4 text-primary" />
							Connections
						</Link>
					</Button>
				</div>
			</section>
		</div>
	)
}
