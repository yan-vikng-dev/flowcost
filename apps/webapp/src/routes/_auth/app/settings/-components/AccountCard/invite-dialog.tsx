import { useMutation, useQueryClient } from "@tanstack/react-query"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
	type SendInvitationInput,
	sendInvitation,
} from "../../-functions/connections"

type InviteDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
	const queryClient = useQueryClient()
	const [email, setEmail] = React.useState("")

	const sendMutation = useMutation({
		mutationFn: async (data: SendInvitationInput) => sendInvitation({ data }),
		onSuccess: async () => {
			setEmail("")
			onOpenChange(false)
			await queryClient.invalidateQueries({ queryKey: ["connectionState"] })
		},
	})

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
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
	)
}
