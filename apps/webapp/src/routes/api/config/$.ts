import { createFileRoute } from "@tanstack/react-router"
import { proxyPosthog } from "@/server/posthog-proxy"

const handle = ({
	request,
	params,
}: {
	request: Request
	params: { _splat?: string }
}) => proxyPosthog(request, params._splat)

export const Route = createFileRoute("/api/config/$")({
	server: {
		handlers: {
			GET: handle,
			POST: handle,
			PUT: handle,
			PATCH: handle,
			DELETE: handle,
			OPTIONS: handle,
			HEAD: handle,
		},
	},
})
