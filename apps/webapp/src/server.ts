// src/server.ts - TanStack Start Server Entry for cloudflare worker

import handler from "@tanstack/react-start/server-entry"

export default {
	async fetch(request: Request) {
		return handler.fetch(request, {
			context: {
				fromFetch: true,
			},
		})
	},
}
