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
						Every expense includes amount, currency, category, and the date it
						was executed. An optional description captures extra detail from
						your message.
					</p>
					<p>
						Dates are normalized to your timezone so reports and totals stay
						consistent even when you travel.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="entry-logging">
				<h2 className="font-semibold text-2xl">Logging via WhatsApp</h2>
				<div className="space-y-4 text-sm">
					<p>
						Type naturally — the assistant extracts structured data from your
						message. You can also send receipt photos, voice notes, or PDF
						documents and it will extract the expense from them.
					</p>
					<p>
						Ask in plain language to list totals, edit entries, or delete them —
						for example &quot;how much did I spend this week?&quot; or
						&quot;change yesterday&apos;s taxi to 12&quot;. Say{" "}
						<span className="font-medium text-foreground">undo</span> right
						after logging to remove the most recent entry.
					</p>
					<p>
						<span className="font-medium text-foreground">/new</span> clears
						conversation context (after about an hour of inactivity it clears
						automatically too). Your logged expenses are never deleted.
					</p>
				</div>
			</section>
		</div>
	)
}
