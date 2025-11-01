import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, XIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	acceptInvitation,
	declineInvitation,
	getConnectionState,
} from "../-functions/connections"

export function IncomingInviteCard() {
	const queryClient = useQueryClient()
	const stateQuery = useQuery({
		queryKey: ["connectionState"],
		queryFn: () => getConnectionState(),
		staleTime: 30_000,
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

	const incomingInvites =
		stateQuery.data?.pending?.filter((inv) => inv.direction === "incoming") ??
		[]

	if (incomingInvites.length === 0) {
		return null
	}

	// Simple initials from name
	function initialsFrom(name?: string) {
		const trimmedName = name?.trim()
		if (!trimmedName) return "?"
		const parts = trimmedName.split(" ").filter(Boolean)
		if (parts.length >= 2) {
			return `${(parts[0]?.[0] ?? "").toUpperCase()}${(parts[1]?.[0] ?? "").toUpperCase()}`
		}
		return (parts[0] ?? "?").slice(0, 2).toUpperCase()
	}

	return (
		<Card className="relative">
			<div className="absolute top-2 right-2 size-2 rounded-full bg-destructive" />
			<CardHeader>
				<CardTitle>Connection Request</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-4">
					{incomingInvites.map((inv) => (
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
									<AvatarFallback>{initialsFrom(inv.user.name)}</AvatarFallback>
								</Avatar>
								<div className="text-sm">
									<div className="font-medium">
										{inv.user.name ?? inv.user.email}
									</div>
									<div className="text-muted-foreground">{inv.user.email}</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Button
									aria-label="Accept"
									disabled={acceptMutation.isPending}
									onClick={() => acceptMutation.mutate(inv.id)}
									size="icon-sm"
									variant="outline"
								>
									<CheckIcon />
								</Button>
								<Button
									aria-label="Decline"
									disabled={declineMutation.isPending}
									onClick={() => declineMutation.mutate(inv.id)}
									size="icon-sm"
									variant="outline"
								>
									<XIcon />
								</Button>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	)
}
