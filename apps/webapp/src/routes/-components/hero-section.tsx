import { ArrowRightIcon } from "lucide-react"
import { WhatsappIcon } from "@/components/icons/whatsapp-icon"
import { Button } from "@/components/ui/button"
import { whatsappUrl } from "@/config/whatsapp"

export function HeroSection() {
	return (
		<section className="relative flex min-h-screen items-center">
			<div className="mx-auto max-w-4xl space-y-6 px-4 text-center sm:px-6">
				<h1 className="font-bold text-4xl tracking-tight sm:text-6xl lg:text-7xl">
					Track expenses by texting
					<span className="block text-primary">WhatsApp</span>
				</h1>

				<p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-8">
					Text an expense to Flowcost and an AI assistant logs it for you. Get
					automatic weekly and monthly reports, and pair with a partner to share
					spending — no app, no login, just chat.
				</p>

				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button asChild className="group gap-2" size="lg">
						<a href={whatsappUrl} rel="noopener noreferrer" target="_blank">
							<WhatsappIcon size={18} />
							Message us on WhatsApp
							<ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
						</a>
					</Button>
				</div>
			</div>

			<div className="-top-40 -z-10 sm:-top-80 absolute inset-x-0 transform-gpu overflow-hidden blur-3xl">
				<div
					className="-translate-x-1/2 relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] rotate-[30deg] bg-gradient-to-tr from-primary to-secondary opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
					style={{
						clipPath:
							"polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
					}}
				/>
			</div>
		</section>
	)
}
