import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

export function HeroSection() {
	const handleGoogleSignIn = async () => {
		await authClient.signIn.social({
			provider: "google",
			callbackURL: "/app",
		})
	}

	return (
		<section className="relative flex min-h-screen items-center">
			<div className="mx-auto max-w-4xl space-y-6 text-center">
				<h1 className="font-bold text-4xl tracking-tight sm:text-6xl lg:text-7xl">
					Your personal
					<span className="block text-primary">Expense Tracker</span>
				</h1>

				<p className="max-w-2xl text-lg text-muted-foreground leading-8">
					Track your expenses, income, and budgets with ease. Talk to your
					personal AI assistant to manage your data and get insights from
					anywhere, using our free WhatsApp integration.
				</p>

				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					<Button
						className="group"
						onClick={() => void handleGoogleSignIn()}
						size="lg"
					>
						Get Started
						<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
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
