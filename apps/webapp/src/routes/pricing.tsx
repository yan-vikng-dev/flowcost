import { createFileRoute } from "@tanstack/react-router"
import {
	ListChecksIcon,
	Loader2Icon,
	MessageCircleIcon,
	UsersIcon,
	WalletIcon,
} from "lucide-react"
import * as React from "react"
import { FloatingWaves } from "@/components/bg/floating-waves"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import { authClient } from "@/lib/auth-client"
import { LandingHeader } from "./-components/landing-header"

export const Route = createFileRoute("/pricing")({
	component: PricingPage,
})

const features = [
	{
		icon: MessageCircleIcon,
		label: "WhatsApp AI assistant",
	},
	{
		icon: ListChecksIcon,
		label: "Unlimited entries",
	},
	{
		icon: UsersIcon,
		label: "One connection with a partner",
	},
	{
		icon: WalletIcon,
		label: "Unlimited budgets",
	},
]

function PricingPage() {
	const [isLoading, setIsLoading] = React.useState(false)

	const handleGoogleSignIn = async () => {
		setIsLoading(true)
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: "/app",
			})
		} catch {
			setIsLoading(false)
		}
	}

	return (
		<div className="relative min-h-screen overflow-hidden bg-linear-to-b from-background via-background/95 to-primary/10">
			<FloatingWaves
				className="z-0"
				lineColor="rgba(59, 130, 246, 0.18)"
				secondaryWaveSpeedX={0.012}
				waveAmpX={30}
				waveAmpY={16}
				waveSpeedX={0.006}
				waveSpeedY={0.006}
			/>
			<LandingHeader />
			<main className="relative z-10">
				<section className="container mx-auto flex flex-col gap-12 px-4 pt-28 pb-20 sm:px-6 lg:px-8">
					<div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-4 text-center">
						<h1 className="text-balance font-semibold text-3xl tracking-tight sm:text-4xl lg:text-5xl">
							Everything you need, completely free
						</h1>
						<p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
							Track spending, share a budget, and chat with your WhatsApp AI
							assistant without limits.
						</p>
					</div>

					<Card className="mx-auto w-full max-w-xl border-primary/20 bg-linear-to-br from-card/80 via-card/50 to-primary/15 shadow-primary/10 shadow-xl">
						<CardHeader className="gap-4 border-border/40 border-b">
							<div className="flex items-center justify-between gap-4">
								<div className="space-y-1">
									<CardTitle className="text-xl">Free</CardTitle>
									<CardDescription>
										Perfect for personal budgeting and couples.
									</CardDescription>
								</div>
								<span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 font-semibold text-emerald-500 text-xs uppercase tracking-wide">
									Free forever
								</span>
							</div>
							<div className="flex items-end gap-2">
								<span className="font-semibold text-4xl">$0</span>
								<span className="pb-1 text-muted-foreground text-sm">
									per month
								</span>
							</div>
						</CardHeader>
						<CardContent className="space-y-6 pt-2">
							<ul className="space-y-3 text-muted-foreground text-sm">
								{features.map((feature) => {
									const FeatureIcon = feature.icon
									return (
										<li className="flex items-start gap-3" key={feature.label}>
											<FeatureIcon className="mt-0.5 h-4 w-4 text-primary" />
											<span>{feature.label}</span>
										</li>
									)
								})}
							</ul>
						</CardContent>
						<CardFooter className="flex w-full flex-col gap-3">
							<Button
								className="w-full"
								disabled={isLoading}
								onClick={() => void handleGoogleSignIn()}
								size="lg"
							>
								{isLoading ? (
									<Loader2Icon className="h-4 w-4 animate-spin" />
								) : (
									"Get started for free"
								)}
							</Button>
							<span className="text-muted-foreground text-xs">
								Sign in with Google to start tracking in seconds.
							</span>
						</CardFooter>
					</Card>
				</section>
			</main>
		</div>
	)
}
