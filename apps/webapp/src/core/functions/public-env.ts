import { env } from "cloudflare:workers"
import { createServerFn } from "@tanstack/react-start"

export type PublicEnv = {
	posthogKey: string
}

export const getPublicEnv = createServerFn().handler(() => {
	return {
		posthogKey: env.VITE_POSTHOG_KEY,
	} satisfies PublicEnv
})
