import { createFileRoute } from "@tanstack/react-router"
import { BarChart3Icon } from "lucide-react"

export const Route = createFileRoute("/docs/features/reports")({
	component: ReportsDocsPage,
})

function ReportsDocsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<BarChart3Icon className="h-6 w-6 text-primary" />
					<h1 className="font-semibold text-3xl tracking-tight">Reports</h1>
				</div>
			</div>
			<section className="scroll-mt-28 space-y-3" id="report-schedule">
				<h2 className="font-semibold text-2xl">Schedule and pausing</h2>
				<div className="space-y-4 text-sm">
					<p>
						Weekly and monthly expense summaries are on by default. Weekly
						reports land on your configured weekday; monthly reports land on the
						last day of the month. Both share a single delivery time in your
						timezone.
					</p>
					<p>
						Tell the assistant to pause or resume reports (for example
						&quot;pause my reports&quot; or &quot;resume weekly reports&quot;).
						Use <span className="font-medium text-foreground">/settings</span>{" "}
						to see your current schedule.
					</p>
					<p>
						If you have been inactive for more than 24 hours, WhatsApp&apos;s
						messaging rules may block the full report. Flowcost then sends a
						&quot;report is ready&quot; template with a{" "}
						<span className="font-medium text-foreground">Show report</span>{" "}
						button — tap it to receive the summary.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="report-contents">
				<h2 className="font-semibold text-2xl">What reports include</h2>
				<div className="space-y-4 text-sm">
					<p>
						Summaries cover expense totals, category breakdowns, progress
						indicators, top-spending days, and partner totals when you are
						paired. Amounts can be shown in your display currency.
					</p>
					<p>Daily digests are not sent — only weekly and monthly summaries.</p>
				</div>
			</section>
		</div>
	)
}
