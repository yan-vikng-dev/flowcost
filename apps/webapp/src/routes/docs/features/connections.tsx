import { createFileRoute } from "@tanstack/react-router"
import { UsersIcon } from "lucide-react"

export const Route = createFileRoute("/docs/features/connections")({
	component: ConnectionsDocsPage,
})

function ConnectionsDocsPage() {
	return (
		<div className="space-y-10">
			<div className="space-y-3">
				<div className="flex items-center gap-3">
					<UsersIcon className="h-6 w-6 text-primary" />
					<h1 className="font-semibold text-3xl tracking-tight">Connections</h1>
				</div>
			</div>
			<section className="scroll-mt-28 space-y-3" id="pairing">
				<h2 className="font-semibold text-2xl">Pairing via /pair</h2>
				<div className="space-y-4 text-sm">
					<p>
						Share expenses with one partner using WhatsApp commands. Send{" "}
						<span className="font-medium text-foreground">
							/pair &lt;phone&gt;
						</span>{" "}
						with the invitee&apos;s phone number (digits only). They receive a
						DM asking to accept or decline.
					</p>
					<p>
						The invitee replies{" "}
						<span className="font-medium text-foreground">/accept</span> or{" "}
						<span className="font-medium text-foreground">/decline</span>.
						Pending requests expire after 24 hours.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="connection-limits">
				<h2 className="font-semibold text-2xl">Limits and unpairing</h2>
				<div className="space-y-4 text-sm">
					<p>
						Each user can have one active connection. You cannot pair with
						yourself or invite someone who is already connected elsewhere.
					</p>
					<p>
						Either party can end the connection with{" "}
						<span className="font-medium text-foreground">/unpair</span>. Shared
						totals in reports stop once the connection is removed.
					</p>
				</div>
			</section>
		</div>
	)
}
