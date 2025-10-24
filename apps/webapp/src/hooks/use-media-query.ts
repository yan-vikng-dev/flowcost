import * as React from "react"

export function useMediaQuery(query: string) {
	const getMatches = (q: string) =>
		typeof window !== "undefined" ? window.matchMedia(q).matches : false

	const [matches, setMatches] = React.useState<boolean>(getMatches(query))

	React.useEffect(() => {
		const mediaQueryList = window.matchMedia(query)
		const listener = () => setMatches(mediaQueryList.matches)
		listener()

		mediaQueryList.addEventListener("change", listener)
		return () => mediaQueryList.removeEventListener("change", listener)
	}, [query])

	return matches
}
