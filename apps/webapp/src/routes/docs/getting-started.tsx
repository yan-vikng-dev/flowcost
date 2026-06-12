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
						Open WhatsApp and message the Flowcost number. Your first contact
						creates your account automatically — there is no sign-up or web
						linking step.
					</p>
					<p>
						When you open the chat, Flowcost sends a short welcome tour and
						buttons to confirm your auto-detected timezone and currency (based
						on your phone number&apos;s country). Tap{" "}
						<span className="font-medium text-foreground">Looks right</span> or{" "}
						<span className="font-medium text-foreground">Change settings</span>{" "}
						to finish setup, or just start logging — the assistant handles your
						first message either way.
					</p>
					<p>
						WhatsApp also shows ice-breaker prompts (for example &quot;Log my
						first expense&quot;) and registered slash commands when you type{" "}
						<span className="font-medium text-foreground">/</span>.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="commands">
				<h2 className="font-semibold text-2xl">Commands and settings</h2>
				<div className="space-y-4 text-sm">
					<p>
						Send <span className="font-medium text-foreground">/help</span> for
						a full list of what you can do.{" "}
						<span className="font-medium text-foreground">/settings</span> shows
						your timezone, currencies, report schedule, and pairing status.{" "}
						<span className="font-medium text-foreground">/start</span> replays
						the welcome tour.
					</p>
					<p>
						Other commands:{" "}
						<span className="font-medium text-foreground">/new</span> clears
						conversation context (logged expenses stay safe),{" "}
						<span className="font-medium text-foreground">
							/pair &lt;phone&gt;
						</span>{" "}
						invites a partner,{" "}
						<span className="font-medium text-foreground">/accept</span> and{" "}
						<span className="font-medium text-foreground">/decline</span> handle
						pairing requests, and{" "}
						<span className="font-medium text-foreground">/unpair</span> ends an
						active connection.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="first-entry">
				<h2 className="font-semibold text-2xl">First entry</h2>
				<div className="space-y-4 text-sm">
					<p>
						Describe an expense in plain language, for example:{" "}
						<span className="font-medium text-foreground">
							&quot;Coffee 4.50 USD&quot;
						</span>{" "}
						or{" "}
						<span className="font-medium text-foreground">
							&quot;Groceries 32 EUR yesterday&quot;
						</span>
						. The assistant parses amount, currency, category, and date.
					</p>
					<p>
						Each logged expense stores an amount, currency, category, optional
						description, and the date it happened (in your timezone). Say{" "}
						<span className="font-medium text-foreground">undo</span> right
						after logging to remove the last entry.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="reports">
				<h2 className="font-semibold text-2xl">Reports</h2>
				<div className="space-y-4 text-sm">
					<p>
						Weekly and monthly expense summaries are on by default. Weekly
						reports arrive on your chosen weekday; monthly reports arrive on the
						last day of the month. Tell the assistant to pause or resume them
						anytime (for example &quot;pause my reports&quot;).
					</p>
					<p>
						If you have been inactive for more than 24 hours, WhatsApp may
						deliver a &quot;report is ready&quot; message with a{" "}
						<span className="font-medium text-foreground">Show report</span>{" "}
						button instead of the full summary. Tap it to receive the report.
					</p>
				</div>
			</section>
		</div>
	)
}
