import { useMutation } from "@tanstack/react-query"
import { Trash2Icon } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
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
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldTitle,
} from "@/components/ui/field"
import { deleteCurrentUser } from "@/core/functions/account"
import { authClient } from "@/lib/auth-client"

export function DangerZoneCard() {
	const [open, setOpen] = React.useState(false)
	const deleteMutation = useMutation({
		mutationFn: () => deleteCurrentUser(),
	})

	return (
		<>
			<Card className="border-destructive/60">
				<CardHeader>
					<CardTitle>Danger Zone</CardTitle>
				</CardHeader>
				<CardContent>
					<Field orientation="horizontal">
						<FieldContent>
							<FieldTitle>Delete account</FieldTitle>
							<FieldDescription>
								Permanently delete your account and all associated data.
							</FieldDescription>
						</FieldContent>
						<Button
							disabled={deleteMutation.isPending}
							onClick={() => setOpen(true)}
							variant="destructive"
						>
							<Trash2Icon />
							Delete
						</Button>
					</Field>
				</CardContent>
			</Card>

			<AlertDialog
				onOpenChange={(next) => {
					if (deleteMutation.isPending) return
					setOpen(next)
				}}
				open={open}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete account?</AlertDialogTitle>
						<AlertDialogDescription>
							This action cannot be undone. This will permanently delete your
							account and remove all associated data.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: "destructive" })}
							disabled={deleteMutation.isPending}
							onClick={() => {
								void (async () => {
									try {
										await deleteMutation.mutateAsync()
										toast.success("Account deleted")
										setOpen(false)
										await authClient.signOut()
										window.location.assign("/")
									} catch {
										toast.error("Failed to delete account")
									}
								})()
							}}
						>
							{deleteMutation.isPending ? "Deleting..." : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
