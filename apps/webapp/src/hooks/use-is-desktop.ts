import { useMediaQuery } from "@/hooks/use-media-query"

// Returns true at Tailwind's `md` breakpoint and above (>= 768px)
export function useIsDesktop() {
	return useMediaQuery("(min-width: 768px)")
}
