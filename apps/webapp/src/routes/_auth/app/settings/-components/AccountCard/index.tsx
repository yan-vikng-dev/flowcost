import { useMutation, useQueryClient } from "@tanstack/react-query"
import { LogOutIcon, MailPlusIcon, Trash2Icon, XIcon } from "lucide-react"
import * as React from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserAvatar } from "@/components/user-avatar"
import { useConnectionState } from "@/hooks/use-connection-state"
import { authClient } from "@/lib/auth-client"
import {
	cancelInvitation,
	disconnectConnection,
} from "../../-functions/connections"
import { InviteDialog } from "./InviteDialog"

export function AccountCard() {
	const queryClient = useQueryClient()
	const { data: session } = authClient.useSession()
	const user = session?.user
	const stateQuery = useConnectionState()
	const [inviteOpen, setInviteOpen] = React.useState(false)
	const [logoutOpen, setLogoutOpen] = React.useState(false)

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
	const connectedUser = stateQuery.data?.connection

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Account</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						<div className="flex items-center justify-between gap-4">
							{user && (
								<div className="flex items-center gap-3">
									<UserAvatar className="h-10 w-10" user={user} />
									<div className="text-sm">
										{user.name && (
											<div className="font-medium">{user.name}</div>
										)}
										{user.email && (
											<div className="text-muted-foreground text-xs">
												{user.email}
											</div>
										)}
									</div>
								</div>
							)}
							<Button
								onClick={() => setLogoutOpen(true)}
								size="icon"
								variant="outline"
							>
								<LogOutIcon className="h-4 w-4" />
							</Button>
						</div>

						{isConnected && connectedUser && (
							<div className="border-border border-t pt-4">
								<div className="flex items-center justify-between gap-4">
									<div className="flex items-center gap-3">
										<UserAvatar className="h-10 w-10" user={connectedUser} />
										<div className="text-sm">
											{connectedUser.name && (
												<div className="font-medium">{connectedUser.name}</div>
											)}
											{connectedUser.email && (
												<div className="text-muted-foreground text-xs">
													{connectedUser.email}
												</div>
											)}
										</div>
									</div>
									<Button
										disabled={disconnectMutation.isPending}
										onClick={() => disconnectMutation.mutate()}
										size="icon"
										variant="outline"
									>
										<XIcon />
									</Button>
								</div>
							</div>
						)}

						{!isConnected && (
							<div className="border-border border-t pt-4">
								{stateQuery.isLoading ? (
									<div className="text-muted-foreground text-sm">
										Loading...
									</div>
								) : outgoingInvite ? (
									<div className="flex items-center justify-between gap-4">
										<div className="flex items-center gap-3">
											<UserAvatar
												className="h-10 w-10"
												user={outgoingInvite.user}
											/>
											<div className="text-sm">
												<div className="font-medium">
													{outgoingInvite.user.name ??
														outgoingInvite.user.email}
												</div>
												<div className="text-muted-foreground text-xs">
													Pending invite
												</div>
											</div>
										</div>
										<Button
											disabled={cancelMutation.isPending}
											onClick={() => cancelMutation.mutate(outgoingInvite.id)}
											size="icon"
											variant="outline"
										>
											<Trash2Icon />
										</Button>
									</div>
								) : (
									<div className="flex items-center justify-between gap-4">
										<div className="text-sm">
											<div className="font-medium">Partner connection</div>
											<div className="text-muted-foreground text-xs">
												Not connected
											</div>
										</div>
										<Button onClick={() => setInviteOpen(true)} size="icon">
											<MailPlusIcon />
										</Button>
									</div>
								)}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<InviteDialog onOpenChange={setInviteOpen} open={inviteOpen} />

			<AlertDialog onOpenChange={setLogoutOpen} open={logoutOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Log out?</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to log out? You will need to sign in again
							to access your account.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setLogoutOpen(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								void authClient.signOut()
								setLogoutOpen(false)
							}}
						>
							Log out
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
