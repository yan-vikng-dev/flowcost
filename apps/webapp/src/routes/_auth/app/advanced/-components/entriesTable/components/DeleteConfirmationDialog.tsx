import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Table } from "@tanstack/react-table"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import type { MonthlyEntry } from "@/core/functions/entries"
import { deleteEntries } from "@/core/functions/entries"

interface DeleteConfirmationDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	confirmIds: string[]
	setConfirmIds: (ids: string[]) => void
	table: Table<MonthlyEntry>
}

export function DeleteConfirmationDialog({
	open,
	onOpenChange,
	confirmIds,
	setConfirmIds,
	table,
}: DeleteConfirmationDialogProps) {
	const queryClient = useQueryClient()
	const deleteMut = useMutation({
		mutationFn: (ids: string[]) => deleteEntries({ data: { ids } }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
			])
		},
	})
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{confirmIds.length > 1
							? `Delete ${confirmIds.length} entries?`
							: "Delete entry?"}
					</DialogTitle>
					<DialogDescription>This action cannot be undone.</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button onClick={() => onOpenChange(false)} variant="ghost">
						Cancel
					</Button>
					<Button
						onClick={() => {
							void (async () => {
								try {
									if (confirmIds.length === 0) return
									await deleteMut.mutateAsync(confirmIds)
									toast.success(
										confirmIds.length > 1
											? `Deleted ${confirmIds.length} entries`
											: "Deleted 1 entry",
									)
									onOpenChange(false)
									setConfirmIds([])
									table.resetRowSelection()
								} catch {
									toast.error("Failed to delete entries")
								}
							})()
						}}
						variant="destructive"
					>
						Delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
