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
				<h2 className="font-semibold text-2xl">Report schedule</h2>
				<div className="space-y-4 text-sm">
					<p>
						Reports are available after WhatsApp is linked. Enable daily,
						weekly, or monthly delivery and choose the time that works for you.
					</p>
					<p>
						When you update report preferences, Flowcost reschedules deliveries
						through the backend scheduler to keep timing accurate.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="weekly-options">
				<h2 className="font-semibold text-2xl">Weekly options</h2>
				<div className="space-y-4 text-sm">
					<p>
						Weekly reports include a weekday selector. You can change the day or
						disable weekly reports without affecting daily or monthly settings.
					</p>
					<p>
						All report schedules share a single delivery time so you can keep
						your summaries predictable.
					</p>
				</div>
			</section>
		</div>
	)
}
