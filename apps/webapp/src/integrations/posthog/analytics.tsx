import { useRouterState } from "@tanstack/react-router"
import { useEffect, useRef } from "react"
import { initPosthog, posthog } from "./client"

export function PosthogAnalytics() {
	const location = useRouterState({ select: (state) => state.location })
	const initializedRef = useRef(false)

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

	return null
}
