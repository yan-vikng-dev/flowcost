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
						message. Use{" "}
						<span className="font-medium text-foreground">/new</span> for a
						guided prompt if you prefer step-by-step entry.
					</p>
					<p>
						Ask to update or remove entries in chat. Changes apply immediately
						to upcoming reports.
					</p>
				</div>
			</section>
		</div>
	)
}
