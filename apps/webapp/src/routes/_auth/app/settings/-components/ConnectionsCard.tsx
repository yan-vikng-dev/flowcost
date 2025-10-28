import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, MailPlus, Trash2, X } from "lucide-react"
import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	acceptInvitation,
	cancelInvitation,
	declineInvitation,
	disconnectConnection,
	getConnectionState,
	type SendInvitationInput,
	sendInvitation,
} from "../-functions/connections"

export function ConnectionsCard() {
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

	const acceptMutation = useMutation({
		mutationFn: (id: string) => acceptInvitation({ data: { id } }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["connectionState"] })
			await queryClient.invalidateQueries({ queryKey: ["entries"] })
		},
	})

	const declineMutation = useMutation({
		mutationFn: (id: string) => declineInvitation({ data: { id } }),
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

	// Simpler initials - avoid regex
	function initialsFrom(name?: string, email?: string) {
		const n = name?.trim()
		if (n) {
			const p = n.split(" ").filter(Boolean)
			if (p.length >= 2)
				return `${(p[0]?.[0] ?? "").toUpperCase()}${(p[1]?.[0] ?? "").toUpperCase()}`
			if (p.length === 1) return (p[0] ?? "?").slice(0, 2).toUpperCase()
		}
		const src = email || "?"
		const at = src.indexOf("@")
		const local = at > 0 ? src.slice(0, at) : src
		const words: string[] = []
		let curr = ""
		for (const ch of local) {
			if (ch === "." || ch === "_" || ch === "-") {
				if (curr) {
					words.push(curr)
					curr = ""
				}
			} else {
				curr += ch
			}
		}
		if (curr) words.push(curr)
		if (words.length >= 2)
			return `${(words[0]?.[0] ?? "").toUpperCase()}${(words[1]?.[0] ?? "").toUpperCase()}`
		if (words.length === 1) return (words[0] ?? "?").slice(0, 2).toUpperCase()
		return "?"
	}

	function renderActions(direction: "incoming" | "outgoing", id: string) {
		if (direction === "incoming") {
			return (
				<>
					<Button
						aria-label="Accept"
						disabled={acceptMutation.isPending}
						onClick={() => acceptMutation.mutate(id)}
						size="sm"
						variant="ghost"
					>
						<Check className="size-4" />
					</Button>
					<Button
						aria-label="Decline"
						disabled={declineMutation.isPending}
						onClick={() => declineMutation.mutate(id)}
						size="sm"
						variant="ghost"
					>
						<X className="size-4" />
					</Button>
				</>
			)
		}
		return (
			<Button
				aria-label="Cancel"
				disabled={cancelMutation.isPending}
				onClick={() => cancelMutation.mutate(id)}
				size="sm"
				variant="ghost"
			>
				<Trash2 className="size-4" />
			</Button>
		)
	}

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between gap-2">
				<CardTitle>Connection</CardTitle>
				<Button
					onClick={() => setInviteOpen(true)}
					size="sm"
					variant="secondary"
				>
					<MailPlus className="mr-2 size-4" /> Invite
				</Button>
			</CardHeader>
			<CardContent>
				{!stateQuery.data ? (
					<div className="text-muted-foreground text-sm">Loading...</div>
				) : isConnected ? (
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<Avatar>
								<AvatarImage
									alt={
										stateQuery.data.connection?.name ??
										stateQuery.data.connection?.email ??
										""
									}
									src={stateQuery.data.connection?.image}
								/>
								<AvatarFallback>
									{initialsFrom(
										stateQuery.data.connection?.name,
										stateQuery.data.connection?.email,
									)}
								</AvatarFallback>
							</Avatar>
							<div className="text-sm">
								<div className="font-medium">
									{stateQuery.data.connection?.name}
								</div>
								<div className="text-muted-foreground">
									{stateQuery.data.connection?.email}
								</div>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								aria-label="Disconnect"
								disabled={disconnectMutation.isPending}
								onClick={() => disconnectMutation.mutate()}
								size="sm"
								variant="ghost"
							>
								<X className="size-4" />
							</Button>
						</div>
					</div>
				) : (
					<div className="grid gap-4">
						{stateQuery.data.pending?.length ? (
							stateQuery.data.pending.map((inv) => (
								<div
									className="flex items-center justify-between gap-4"
									key={inv.id}
								>
									<div className="flex items-center gap-3">
										<Avatar>
											{inv.user.image ? (
												<AvatarImage
													alt={inv.user.name ?? inv.user.email}
													src={inv.user.image}
												/>
											) : null}
											<AvatarFallback>
												{initialsFrom(inv.user.name, inv.user.email)}
											</AvatarFallback>
										</Avatar>
										<div className="text-sm">
											<div className="flex items-center gap-2">
												<span className="font-medium">
													{inv.user.name ?? inv.user.email}
												</span>
												<Badge
													variant={
														inv.direction === "incoming"
															? "primary"
															: "secondary"
													}
												>
													{inv.direction === "incoming"
														? "Incoming"
														: "Outgoing"}
												</Badge>
											</div>
											<div className="text-muted-foreground">
												{inv.user.email}
											</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										{renderActions(inv.direction, inv.id)}
									</div>
								</div>
							))
						) : (
							<div className="text-muted-foreground text-sm">
								No pending invites
							</div>
						)}
					</div>
				)}
			</CardContent>

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
							onChange={(e) => setEmail(e.target.value)}
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
		</Card>
	)
}
