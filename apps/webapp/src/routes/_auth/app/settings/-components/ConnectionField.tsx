import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MailPlusIcon, Trash2Icon, XIcon } from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	cancelInvitation,
	disconnectConnection,
	getConnectionState,
	type SendInvitationInput,
	sendInvitation,
} from "../-functions/connections"

export function ConnectionField() {
	const queryClient = useQueryClient()
	const stateQuery = useQuery({
		queryKey: ["connectionState"],
		queryFn: () => getConnectionState(),
		staleTime: 30_000,
	})

	const [email, setEmail] = React.useState("")
	const [inviteOpen, setInviteOpen] = React.useState(false)

	const sendMutation = useMutation({
		mutationFn: async (data: SendInvitationInput) => sendInvitation({ data }),
		onSuccess: async () => {
			setEmail("")
			setInviteOpen(false)
			await queryClient.invalidateQueries({ queryKey: ["connectionState"] })
		},
	})

	const cancelMutation = useMutation({
		mutationFn: (id: string) => cancelInvitation({ data: { id } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["connectionState"] })
		},
	})

	const disconnectMutation = useMutation({
		mutationFn: () => disconnectConnection(),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["connectionState"] })
			await queryClient.invalidateQueries({ queryKey: ["entries"] })
		},
	})

	const isConnected = Boolean(stateQuery.data?.connection)
	const pendingInvites = stateQuery.data?.pending ?? []
	const outgoingInvite = pendingInvites.find(
		(inv) => inv.direction === "outgoing",
	)

	return (
		<>
			<Field orientation="horizontal">
				<FieldContent>
					<FieldTitle>Connection</FieldTitle>
					<FieldDescription>
						{stateQuery.isLoading
							? "Loading..."
							: isConnected
								? `Connected to ${stateQuery.data?.connection?.name ?? stateQuery.data?.connection?.email ?? "someone"}`
								: outgoingInvite
									? `Pending invite to ${outgoingInvite.user.name ?? outgoingInvite.user.email}`
									: "Not connected"}
					</FieldDescription>
				</FieldContent>
				{!stateQuery.isLoading && (
					<div className="flex items-center gap-2">
						{isConnected ? (
							<Button
								aria-label="Disconnect"
								disabled={disconnectMutation.isPending}
								onClick={() => disconnectMutation.mutate()}
								size="sm"
								variant="outline"
							>
								<XIcon className="mr-2 size-4" />
								Disconnect
							</Button>
						) : outgoingInvite ? (
							<Button
								aria-label="Cancel invite"
								disabled={cancelMutation.isPending}
								onClick={() => cancelMutation.mutate(outgoingInvite.id)}
								size="sm"
								variant="outline"
							>
								<Trash2Icon className="mr-2 size-4" />
								Cancel
							</Button>
						) : (
							<Button
								onClick={() => setInviteOpen(true)}
								size="sm"
								variant="outline"
							>
								<MailPlusIcon className="mr-2 size-4" />
								Invite
							</Button>
						)}
					</div>
				)}
			</Field>

			<Dialog onOpenChange={setInviteOpen} open={inviteOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Invite by email</DialogTitle>
						<DialogDescription>
							Send an invite to connect and share entries.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-2 py-2">
						<Label>Email</Label>
						<Input
							onChange={(event) => setEmail(event.target.value)}
							placeholder="name@example.com"
							type="email"
							value={email}
						/>
					</div>
					<DialogFooter>
						<Button
							disabled={sendMutation.isPending || email.length === 0}
							onClick={() => sendMutation.mutate({ email })}
						>
							{sendMutation.isPending ? "Sending..." : "Send"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	)
}
