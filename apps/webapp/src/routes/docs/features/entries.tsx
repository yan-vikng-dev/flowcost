import { createFileRoute } from "@tanstack/react-router"
import { ListChecksIcon } from "lucide-react"

export const Route = createFileRoute("/docs/features/entries")({
	component: EntriesDocsPage,
})

function EntriesDocsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<ListChecksIcon className="h-6 w-6 text-primary" />
					<h1 className="font-semibold text-3xl tracking-tight">Entries</h1>
				</div>
			</div>
			<section className="scroll-mt-28 space-y-3" id="entry-model">
				<h2 className="font-semibold text-2xl">What an entry stores</h2>
				<div className="space-y-4 text-sm">
					<p>
						Entries include amount, currency, category, and entry type (expense
						or income). When you create one, Flowcost converts the timestamp
						into a date string using your timezone.
					</p>
					<p>
						That date-first model keeps dashboards and reports aligned with the
						current month even if entries are logged across time zones.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="entry-editing">
				<h2 className="font-semibold text-2xl">Editing and cleanup</h2>
				<div className="space-y-4 text-sm">
					<p>
						Use the advanced entries table to search, filter, and bulk update
						entries for the current month. It is designed for deeper cleanup or
						audits.
					</p>
					<p>
						Updates and deletions invalidate the current month caches so the
						dashboard, budgets, and reports stay in sync.
					</p>
				</div>
			</section>
		</div>
	)
}
