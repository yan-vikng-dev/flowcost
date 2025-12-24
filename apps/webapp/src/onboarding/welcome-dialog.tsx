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
					<DialogTitle>Welcome to Flowcost!</DialogTitle>
					<DialogDescription>
						Let's get you set up with the basics. You can always come back to
						this tour later from Settings.
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
						Skip for now
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
