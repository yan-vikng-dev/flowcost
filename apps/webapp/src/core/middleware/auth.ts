import { getAuth } from "@repo/data-ops/auth/server"
import { createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

async function getAuthContext() {
	const auth = getAuth()
	const req = getRequest()

	try {
		const session = await auth.api.getSession(req)
		if (!session) return null
		return {
			auth: auth,
			userId: session.user.id,
			email: session.user.email,
		} as const
	} catch (err) {
		// In dev, Cloudflare D1 can drop or return non-JSON (e.g., code 1031)
		// Treat any failure as unauthenticated to avoid 500s and allow re-auth.
		console.error("[Auth] Failed to get session:", err)
		return null
	}
}

export const protectedFunctionMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	const context = await getAuthContext()
	return next({ context })
})

export const protectedRequestMiddleware = createMiddleware({
	type: "request",
}).server(async ({ next }) => {
	const context = await getAuthContext()
	return next({ context })
})
