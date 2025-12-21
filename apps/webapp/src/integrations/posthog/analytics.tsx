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
		let isActive = true
		void (async () => {
			if (!initializedRef.current) {
				initializedRef.current = await initPosthog()
			}
			if (!isActive || !initializedRef.current) return
			posthog.capture("$pageview", { $current_url: location.href })
		})()
		return () => {
			isActive = false
		}
	}, [location.href])

	useEffect(() => {
		let isActive = true
		void (async () => {
			if (!initializedRef.current) {
				initializedRef.current = await initPosthog()
			}
			if (!isActive || !initializedRef.current) return
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
		})()
		return () => {
			isActive = false
		}
	}, [
		session?.user?.id,
		session?.user?.email,
		session?.user?.name,
		session?.user,
	])

	return null
}
