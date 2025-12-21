import { env } from "cloudflare:workers"

type PosthogTargets = {
	ingestOrigin: string
	assetsOrigin: string
}

const resolvePosthogTargets = (): PosthogTargets | null => {
	const ingestHost = env.POSTHOG_HOST
	if (!ingestHost) return null

	try {
		const url = new URL(ingestHost)
		let assetsHost = url.host
		if (url.host === "eu.i.posthog.com") {
			assetsHost = "eu-assets.i.posthog.com"
		}
		return {
			ingestOrigin: `${url.protocol}//${url.host}`,
			assetsOrigin: `${url.protocol}//${assetsHost}`,
		}
	} catch {
		return null
	}
}

export const proxyPosthog = (request: Request, path?: string) => {
	const targets = resolvePosthogTargets()
	if (!targets) {
		return new Response("PostHog host not configured", { status: 500 })
	}

	const normalizedPath = path ? path.replace(/^\/+/, "") : ""
	const isStatic = normalizedPath.startsWith("static/")
	const base = isStatic ? targets.assetsOrigin : targets.ingestOrigin
	const baseWithSlash = base.endsWith("/") ? base : `${base}/`

	const target = new URL(normalizedPath, baseWithSlash)
	target.search = new URL(request.url).search
	console.info("[PostHog] Proxy request.", {
		method: request.method,
		path: normalizedPath || "/",
		target: target.toString(),
	})

	const headers = new Headers(request.headers)
	headers.delete("host")
	headers.delete("content-length")

	const method = request.method.toUpperCase()
	const hasBody = method !== "GET" && method !== "HEAD"

	return fetch(target, {
		method,
		headers,
		body: hasBody ? request.body : undefined,
		redirect: "manual",
	})
}
