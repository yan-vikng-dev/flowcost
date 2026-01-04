import { createServerFn } from "@tanstack/react-start"

// Server function that lazily imports server-only APIs inside the handler.
// This keeps the client bundle free of server-only dependencies.
export const checkAuthSession = createServerFn().handler(async () => {
	const { getRequest } = await import("@tanstack/react-start/server")
	const { getAuth } = await import("@repo/db/auth/server")
	const auth = getAuth()
	const req = getRequest()
	const session = await auth.api.getSession(req)
	return session
})
