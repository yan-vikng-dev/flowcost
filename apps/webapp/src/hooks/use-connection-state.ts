import { useQuery } from "@tanstack/react-query"
import { getConnectionState } from "@/routes/_auth/app/settings/-functions/connections"

const CONNECTION_STATE_QUERY_KEY = ["connectionState"] as const
const CONNECTION_STATE_STALE_TIME = 30_000

/**
 * Custom hook to fetch and manage connection state
 * @returns Query result with connection state data
 */
export function useConnectionState() {
	return useQuery({
		queryKey: CONNECTION_STATE_QUERY_KEY,
		queryFn: () => getConnectionState(),
		staleTime: CONNECTION_STATE_STALE_TIME,
	})
}

/**
 * Check if there are incoming connection invites
 * @param connectionState - Connection state query result
 * @returns true if there are incoming invites
 */
export function hasIncomingInvites(
	connectionState: ReturnType<typeof useConnectionState>,
): boolean {
	return (
		connectionState.data?.pending?.some(
			(inv) => inv.direction === "incoming",
		) ?? false
	)
}
