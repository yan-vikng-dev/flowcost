function getTimestamp() {
	if (
		typeof performance !== "undefined" &&
		typeof performance.now === "function"
	) {
		return performance.now()
	}
	return Date.now()
}

export function createPerformanceMeasurer() {
	const timings: Record<string, number> = {}
	const totalStart = getTimestamp()

	const measure = async <T>(
		label: string,
		fn: () => T | Promise<T>,
	): Promise<T> => {
		const stepStart = getTimestamp()
		try {
			return await fn()
		} finally {
			timings[label] = Number((getTimestamp() - stepStart).toFixed(2))
		}
	}

	const getTimings = () => ({ ...timings })
	const getTotalMs = () => Number((getTimestamp() - totalStart).toFixed(2))

	return { measure, getTimings, getTotalMs }
}
