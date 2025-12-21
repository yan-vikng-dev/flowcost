import posthog from "posthog-js"
import { getPublicEnv } from "@/core/functions/public-env"

const isBrowser = typeof window !== "undefined"
let isInitialized = false
let initPromise: Promise<boolean> | null = null

export const initPosthog = async () => {
	if (import.meta.env.DEV) {
		console.info("[PostHog] Disabled in development mode.")
		return false
	}
	if (!isBrowser) return false
	if (isInitialized) return true
	if (initPromise) return initPromise

	initPromise = (async () => {
		const publicEnv = await getPublicEnv()
		const key = publicEnv.posthogKey
		posthog.init(key, {
			api_host: "/api/data",
			defaults: "2025-11-30",
			capture_exceptions: true,
			debug: import.meta.env.MODE === "development",
			capture_pageview: false,
		})
		isInitialized = true
		return true
	})()

	const didInit = await initPromise
	if (!didInit) initPromise = null
	return didInit
}

export { posthog }
