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
			<section className="scroll-mt-28 space-y-3" id="connection-invites">
				<h2 className="font-semibold text-2xl">Invites</h2>
				<div className="space-y-4 text-sm">
					<p>
						Connections are created by inviting a partner via email. Incoming
						and outgoing invitations appear in Settings so you can accept,
						decline, or cancel them.
					</p>
					<p>
						Flowcost enforces a single active connection per user. If either
						party is already connected, new invites are blocked.
					</p>
				</div>
			</section>

			<section className="scroll-mt-28 space-y-3" id="connection-data">
				<h2 className="font-semibold text-2xl">Shared data</h2>
				<div className="space-y-4 text-sm">
					<p>
						Once connected, entries and budgets are shared between both users.
						Dashboards and monthly views include data from the linked partner.
					</p>
					<p>
						You can disconnect at any time from Settings. Shared data is no
						longer combined once the connection is removed.
					</p>
				</div>
			</section>
		</div>
	)
}
