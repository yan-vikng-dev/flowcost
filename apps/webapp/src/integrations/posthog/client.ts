import posthog from "posthog-js"

const isBrowser = typeof window !== "undefined"
let isInitialized = false

export const initPosthog = () => {
	if (import.meta.env.DEV) {
		console.info("[PostHog] Disabled in development mode.")
		return false
	}
	if (!isBrowser || isInitialized) return isInitialized
	const key = import.meta.env.VITE_POSTHOG_KEY
	if (!key) {
		console.warn("[PostHog] Missing VITE_POSTHOG_KEY, skipping init.")
		return false
	}
	posthog.init(key, {
		api_host: "/api/data",
		defaults: "2025-11-30",
		capture_exceptions: true,
		debug: import.meta.env.MODE === "development",
		capture_pageview: false,
	})
	isInitialized = true
	return true
}

export { posthog }
