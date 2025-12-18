import { useCallback, useState } from "react"

const LOCAL_STORAGE_KEY = "flowcost:onboarding:dismissedAt"

export function useOnboardingDismissal() {
	const [dismissedAt, setDismissedAt] = useState<number | null>(() => {
		if (typeof window === "undefined") return null
		const storedValue = localStorage.getItem(LOCAL_STORAGE_KEY)
		return storedValue ? Number(storedValue) : null
	})

	const dismiss = useCallback(() => {
		const now = Date.now()
		localStorage.setItem(LOCAL_STORAGE_KEY, String(now))
		setDismissedAt(now)
	}, [])

	const resetDismissal = useCallback(() => {
		localStorage.removeItem(LOCAL_STORAGE_KEY)
		setDismissedAt(null)
	}, [])

	return { dismissedAt, dismiss, resetDismissal }
}
