import posthog from "posthog-js"

const isBrowser = typeof window !== "undefined"
let isInitialized = false

type PosthogConfig = {
	key: string
}

const getPosthogConfig = (): PosthogConfig | null => {
	if (!import.meta.env.PROD) return null
	const key = import.meta.env.VITE_POSTHOG_KEY
	if (!key) return null
	return { key }
}

export const initPosthog = () => {
	if (!isBrowser || isInitialized) return isInitialized
	const config = getPosthogConfig()
	if (!config) return false
	posthog.init(config.key, {
		api_host: "/config",
		capture_pageview: false,
	})
	isInitialized = true
	return true
}

export { posthog }
