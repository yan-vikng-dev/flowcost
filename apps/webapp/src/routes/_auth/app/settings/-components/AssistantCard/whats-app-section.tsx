import { useMutation, useQuery } from "@tanstack/react-query"
import { Loader2Icon } from "lucide-react"
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
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldTitle,
} from "@/components/ui/field"
import {
	getWhatsappLinkStatus,
	startWhatsappLink,
	unlinkWhatsapp,
} from "@/core/functions/whatsapp"
import { formatPhoneNumber } from "@/utils/phone"

export function WhatsAppSection() {
	const [linkInitiatedAt, setLinkInitiatedAt] = React.useState<number | null>(
		null,
	)
	const [unlinkOpen, setUnlinkOpen] = React.useState(false)

	const whatsappStatusQuery = useQuery({
		queryKey: ["whatsappLinkStatus"],
		queryFn: () => getWhatsappLinkStatus(),
		staleTime: 60 * 1000,
		refetchInterval: (query) => {
			if (
				linkInitiatedAt !== null &&
				!query.state.data?.linked &&
				Date.now() - linkInitiatedAt < 5 * 60 * 1000
			) {
				return 2000
			}
			return false
		},
	})

	const startLinkMutation = useMutation({
		mutationFn: async () => {
			const res = await startWhatsappLink()
			if (res?.url) {
				window.open(res.url, "_blank")
			}
		},
		onSuccess: async () => {
			setLinkInitiatedAt(Date.now())
			await whatsappStatusQuery.refetch()
		},
	})

	const unlinkMutation = useMutation({
		mutationFn: async () => {
			await unlinkWhatsapp()
		},
		onSuccess: async () => {
			await whatsappStatusQuery.refetch()
			setUnlinkOpen(false)
		},
	})

	React.useEffect(() => {
		if (whatsappStatusQuery.data?.linked && linkInitiatedAt !== null) {
			setLinkInitiatedAt(null)
		}
	}, [whatsappStatusQuery.data?.linked, linkInitiatedAt])

	const isLinked = whatsappStatusQuery.data?.linked ?? false
	const isLoading = whatsappStatusQuery.isLoading
	const waId = whatsappStatusQuery.data?.waId
	const description = isLoading
		? "Checking status..."
		: isLinked && waId
			? `Linked to ${formatPhoneNumber(waId)}`
			: "Not linked"

	const buttonLabel = isLoading
		? "Checking..."
		: isLinked
			? unlinkMutation.isPending
				? "Unlinking..."
				: "Unlink"
			: startLinkMutation.isPending
				? "Opening..."
				: "Link WhatsApp"

	return (
		<>
			<Field orientation="horizontal">
				<FieldContent>
					<FieldTitle>WhatsApp</FieldTitle>
					<FieldDescription>{description}</FieldDescription>
				</FieldContent>
				<Button
					disabled={
						isLoading ||
						(isLinked ? unlinkMutation.isPending : startLinkMutation.isPending)
					}
					onClick={() => {
						if (isLinked) {
							setUnlinkOpen(true)
						} else {
							startLinkMutation.mutate()
						}
					}}
					variant="outline"
				>
					{(isLoading ||
						unlinkMutation.isPending ||
						startLinkMutation.isPending) && (
						<Loader2Icon className="size-4 animate-spin" />
					)}
					{buttonLabel}
				</Button>
			</Field>

			<AlertDialog onOpenChange={setUnlinkOpen} open={unlinkOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Unlink WhatsApp?</AlertDialogTitle>
						<AlertDialogDescription>
							This will remove your WhatsApp link. You can link it again later.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={() => setUnlinkOpen(false)}>
							Cancel
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={unlinkMutation.isPending}
							onClick={() => {
								unlinkMutation.mutate()
							}}
						>
							{unlinkMutation.isPending ? (
								<>
									<Loader2Icon className="size-4 animate-spin" />
									Unlinking...
								</>
							) : (
								"Unlink"
							)}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
