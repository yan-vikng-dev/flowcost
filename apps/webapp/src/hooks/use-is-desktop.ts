import { useMediaQuery } from "@/hooks/use-media-query";

// Returns true at Tailwind's `sm` breakpoint and above (>= 640px)
export function useIsDesktop() {
  return useMediaQuery("(min-width: 640px)");
}
