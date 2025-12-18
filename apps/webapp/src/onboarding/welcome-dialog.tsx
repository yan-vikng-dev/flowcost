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
import { useOnboardingTour } from "./provider"

export function WelcomeDialog() {
	const { shouldShowWelcome, dismissTour, startTour } = useOnboardingTour()
	const [isOpen, setIsOpen] = React.useState(false)

	React.useEffect(() => {
		setIsOpen(shouldShowWelcome)
	}, [shouldShowWelcome])

	if (!shouldShowWelcome) {
		return null
	}

	return (
		<Dialog onOpenChange={setIsOpen} open={isOpen}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Meet Bob, your tour guide</DialogTitle>
					<DialogDescription>
						We noticed a few setup steps still need love. Bob can walk you
						through them, and you can always come back from Settings later.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="gap-2">
					<Button
						onClick={() => {
							dismissTour()
							setIsOpen(false)
						}}
						variant="outline"
					>
						Skip tour
					</Button>
					<Button
						onClick={() => {
							startTour()
							setIsOpen(false)
						}}
					>
						Start tour
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
