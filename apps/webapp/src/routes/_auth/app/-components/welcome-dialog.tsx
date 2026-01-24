import { useQuery } from "@tanstack/react-query"
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
import { getCurrentUserMeta } from "@/core/functions/current-user"

const STORAGE_KEY = "flowcost:welcomeDismissedAt"
const ONE_HOUR_MS = 60 * 60 * 1000

function isWithinLastHour(createdAt: number) {
	const now = Date.now()
	return now >= createdAt && now - createdAt <= ONE_HOUR_MS
}

export function WelcomeDialog() {
	const [open, setOpen] = React.useState(false)
	const hasEvaluated = React.useRef(false)

	const userMetaQuery = useQuery({
		queryKey: ["currentUserMeta"],
		queryFn: () => getCurrentUserMeta(),
		staleTime: 5 * 60 * 1000,
	})

	React.useEffect(() => {
		if (hasEvaluated.current) return
		if (!userMetaQuery.data?.createdAt) return
		if (typeof window === "undefined") return
		hasEvaluated.current = true

		const dismissedAt = window.localStorage.getItem(STORAGE_KEY)
		if (dismissedAt) return

		if (isWithinLastHour(userMetaQuery.data.createdAt)) {
			setOpen(true)
		}
	}, [userMetaQuery.data?.createdAt])

	const handleOpenChange = React.useCallback((nextOpen: boolean) => {
		setOpen(nextOpen)
		if (!nextOpen && typeof window !== "undefined") {
			window.localStorage.setItem(STORAGE_KEY, String(Date.now()))
		}
	}, [])

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="max-w-sm" showCloseButton={false}>
				<div className="flex flex-col items-center gap-4 text-center">
					<img
						alt="Flowcost logo"
						className="h-28 w-28 object-contain"
						src="/logo/logo-transparent-320.webp"
					/>
					<DialogHeader className="items-center text-center">
						<DialogTitle>
							Welcome to Flowcost! I&apos;m bob, the almighty
						</DialogTitle>
						<DialogDescription className="text-balance text-center">
							Don&apos;t get too overwhelmed by the dashboard. I&apos;ve put a
							checklist for things you should do to get familiar, but if
							you&apos;re brave you can dismiss it and explore on your own.
						</DialogDescription>
					</DialogHeader>
				</div>
				<DialogFooter className="sm:flex-col">
					<Button className="w-full" onClick={() => handleOpenChange(false)}>
						Dismiss
					</Button>
					<Button
						className="w-full"
						onClick={() => handleOpenChange(false)}
						variant="secondary"
					>
						Dismiss, but in gray
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
