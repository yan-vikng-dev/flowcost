import { getAuth } from "@repo/db/auth/server"
import { getDb } from "@repo/db/database/setup"
import { getPartnerUserId } from "@repo/db/drizzle/queries/connections"
import { redirect } from "@tanstack/react-router"
import { createMiddleware } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

async function getAuthContext() {
	const auth = getAuth()
	const req = getRequest()
	const session = await auth.api.getSession(req)
	if (!session) throw redirect({ to: "/" })
	const db = getDb()
	const partnerUserId = await getPartnerUserId(db, session.user.id)
	const allowedUserIds = partnerUserId
		? [session.user.id, partnerUserId]
		: [session.user.id]
	return {
		auth: auth,
		userId: session.user.id,
		email: session.user.email,
		partnerUserId,
		allowedUserIds,
	} as const
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
