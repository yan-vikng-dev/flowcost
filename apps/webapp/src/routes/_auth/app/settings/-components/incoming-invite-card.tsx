import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import { useConnectionState } from "@/hooks/use-connection-state"
import { acceptInvitation, declineInvitation } from "../-functions/connections"

export function IncomingInviteCard() {
	const queryClient = useQueryClient()
	const stateQuery = useConnectionState()

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
								<UserAvatar className="h-10 w-10" user={inv.user} />
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
