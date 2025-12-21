import { useRouterState } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { authClient } from "@/lib/auth-client"
import { initPosthog, posthog } from "./client"

export function PosthogAnalytics() {
	const location = useRouterState({ select: (state) => state.location })
	const { data: session } = authClient.useSession()
	const initializedRef = useRef(false)
	const lastIdentifiedUserId = useRef<string | null>(null)

	useEffect(() => {
		initializedRef.current = initPosthog()
	}, [])

	useEffect(() => {
		if (!initializedRef.current) return
		posthog.capture("$pageview", { $current_url: location.href })
	}, [location.href])

	useEffect(() => {
		if (!initializedRef.current) return
		const user = session?.user
		if (!user?.id) {
			if (lastIdentifiedUserId.current) {
				posthog.reset()
				lastIdentifiedUserId.current = null
			}
			return
		}

		if (lastIdentifiedUserId.current !== user.id) {
			posthog.identify(user.id, {
				email: user.email ?? undefined,
				name: user.name ?? undefined,
			})
			lastIdentifiedUserId.current = user.id
		}
	}, [
		session?.user?.id,
		session?.user?.email,
		session?.user?.name,
		session?.user,
	])

	return null
}
