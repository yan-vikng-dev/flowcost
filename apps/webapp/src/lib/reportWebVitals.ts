type Metric = import("web-vitals").Metric

type WebVitalsMetric = Metric & {
	navigation?: PerformanceNavigationTiming
}

type ReportFn = (metric: WebVitalsMetric) => void

const defaultReporter: ReportFn = (metric) => {
	const navigationEntry = metric.navigation
	const url = `${window.location.pathname}${window.location.search}${window.location.hash}`
	const element =
		"entries" in metric && metric.entries[0]
			? (metric.entries[0] as PerformanceEntry & { element?: Element }).element
			: undefined

	// eslint-disable-next-line no-console
	console.info(`[vitals] ${metric.name}`, {
		value: Number(metric.value.toFixed(2)),
		delta: Number(metric.delta.toFixed(2)),
		id: metric.id,
		rating: metric.rating,
		url,
		element: element
			? `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""}`
			: null,
		navigationStart: navigationEntry?.startTime ?? null,
		domContentLoaded: navigationEntry?.domContentLoadedEventEnd ?? null,
		loadEventEnd: navigationEntry?.loadEventEnd ?? null,
	})
}

let initialized = false

export function initWebVitals(options?: { report?: ReportFn }) {
	if (initialized || typeof window === "undefined") return
	initialized = true

	const report = options?.report ?? defaultReporter
	const navigationEntry = performance.getEntriesByType?.("navigation")?.[0] as
		| PerformanceNavigationTiming
		| undefined

	void import("web-vitals")
		.then(
			({
				onCLS,
				onFCP,
				onINP,
				onLCP,
				onTTFB,
			}: {
				onCLS: (
					cb: (metric: Metric) => void,
					opts?: { reportAllChanges?: boolean },
				) => void
				onFCP: (cb: (metric: Metric) => void) => void
				onINP: (cb: (metric: Metric) => void) => void
				onLCP: (cb: (metric: Metric) => void) => void
				onTTFB: (cb: (metric: Metric) => void) => void
			}) => {
				const handler = (metric: Metric) => {
					report({ ...metric, navigation: navigationEntry })
				}

				onCLS(handler, { reportAllChanges: true })
				onFCP(handler)
				onINP(handler)
				onLCP(handler)
				onTTFB(handler)
			},
		)
		.catch((error) => {
			if (import.meta.env?.DEV) {
				// eslint-disable-next-line no-console
				console.warn("[vitals] failed to init", error)
			}
		})
}
