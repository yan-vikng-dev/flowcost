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
			<section className="scroll-mt-28 space-y-3" id="account-setup">
				<h2 className="font-semibold text-2xl">Account setup</h2>
				<div className="space-y-4 text-sm">
					<p>
						Sign in with Google and open Settings to confirm your timezone and
						display currency. Flowcost normalizes entry dates to your timezone,
						so those preferences keep monthly analytics accurate.
					</p>
					<p>
						The dashboard, budgets, and reports default to the current month, so
						you can focus on what is happening right now without manual filters.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="first-entry">
				<h2 className="font-semibold text-2xl">First entry</h2>
				<div className="space-y-4 text-sm">
					<p>
						Create an entry by choosing an amount, currency, category, and entry
						type (expense or income). You can add an optional description for
						detail.
					</p>
					<p>
						Entries show up immediately in the current month dashboard and the
						advanced entries table. Updates or deletions sync across the same
						month view.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="link-whatsapp">
				<h2 className="font-semibold text-2xl">Link WhatsApp</h2>
				<div className="space-y-4 text-sm">
					<p>
						In Settings / Assistant, tap Link WhatsApp. Flowcost opens a
						WhatsApp message containing a short-lived verification token.
					</p>
					<p>
						Once linked, you can log entries via chat and enable scheduled
						reports without leaving WhatsApp.
					</p>
				</div>
			</section>
		</div>
	)
}
