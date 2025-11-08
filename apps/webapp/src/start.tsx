import { createStart } from "@tanstack/react-start"

declare module "@tanstack/react-start" {
	interface Register {
		server: {
			requestContext: {
				fromFetch: boolean
			}
		}
	}
}

export const startInstance = createStart(() => {
	return {
		defaultSsr: true,
	}
})

startInstance.createMiddleware().server(({ next }) => {
	return next({
		context: {
			fromStartInstanceMw: true,
		},
	})
})

if (typeof window !== "undefined") {
	const shouldInitVitals =
		import.meta.env.DEV ||
		window.localStorage.getItem("flowcost:debug-vitals") === "1"
	if (shouldInitVitals) {
		void import("./lib/reportWebVitals").then(({ initWebVitals }) => {
			initWebVitals()
		})
	}
}
