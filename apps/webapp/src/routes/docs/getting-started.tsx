import { createFileRoute } from "@tanstack/react-router"
import { RocketIcon } from "lucide-react"

export const Route = createFileRoute("/docs/getting-started")({
	component: GettingStartedPage,
})

function GettingStartedPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<RocketIcon className="h-6 w-6 text-primary" />
					<h1 className="font-semibold text-3xl tracking-tight">
						Getting started
					</h1>
				</div>
			</div>
			<section className="scroll-mt-28 space-y-3" id="start-chatting">
				<h2 className="font-semibold text-2xl">Start chatting</h2>
				<div className="space-y-4 text-sm">
					<p>
						Open WhatsApp and message the Flowcost number. Your first message
						creates your account automatically — there is no sign-up or linking
						step.
					</p>
					<p>
						Just describe an expense in plain language, for example:{" "}
						<span className="font-medium text-foreground">
							&quot;Coffee 4.50 USD&quot;
						</span>{" "}
						or{" "}
						<span className="font-medium text-foreground">
							&quot;Groceries 32 EUR yesterday&quot;
						</span>
						. The assistant parses amount, currency, category, and date.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="first-entry">
				<h2 className="font-semibold text-2xl">First entry</h2>
				<div className="space-y-4 text-sm">
					<p>
						Each logged expense stores an amount, currency, category, optional
						description, and the date it happened (in your timezone). You can
						edit or delete entries by asking the assistant in chat.
					</p>
					<p>
						Send <span className="font-medium text-foreground">/help</span> any
						time for the list of slash commands.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="reports">
				<h2 className="font-semibold text-2xl">Reports</h2>
				<div className="space-y-4 text-sm">
					<p>
						Weekly and monthly expense summaries are sent automatically to
						WhatsApp — no toggles to enable. Weekly reports arrive on your
						chosen weekday; monthly reports arrive on the last day of the month.
					</p>
					<p>
						Adjust delivery time and timezone by telling the assistant, or see
						the Reports feature page for details.
					</p>
				</div>
			</section>
		</div>
	)
}
