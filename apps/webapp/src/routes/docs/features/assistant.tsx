import { createFileRoute } from "@tanstack/react-router"
import { MessageCircleIcon } from "lucide-react"

export const Route = createFileRoute("/docs/features/assistant")({
	component: AssistantDocsPage,
})

function AssistantDocsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<MessageCircleIcon className="h-6 w-6 text-primary" />
					<h1 className="font-semibold text-3xl tracking-tight">Assistant</h1>
				</div>
			</div>
			<section className="scroll-mt-28 space-y-3" id="assistant-linking">
				<h2 className="font-semibold text-2xl">Linking</h2>
				<div className="space-y-4 text-sm">
					<p>
						Linking generates a short-lived verification token and opens a
						WhatsApp message for you to send. Once verified, Flowcost stores
						your WhatsApp ID and keeps the connection active.
					</p>
					<p>
						Unlinking removes the association and revokes scheduled reports. You
						can re-link at any time without losing entries.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="assistant-reports">
				<h2 className="font-semibold text-2xl">Reports</h2>
				<div className="space-y-4 text-sm">
					<p>
						The assistant can deliver scheduled summaries to WhatsApp once
						reports are enabled in Settings. Report preferences are stored in
						your user profile.
					</p>
					<p>
						When preferences change, Flowcost reschedules delivery so your
						reports arrive at the correct time.
					</p>
				</div>
			</section>
		</div>
	)
}
