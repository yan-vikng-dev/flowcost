import type { Currency } from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import { Link, useRouterState } from "@tanstack/react-router"
import {
	ListChevronsDownUpIcon,
	ListChevronsUpDownIcon,
	PlusIcon,
	SettingsIcon,
} from "lucide-react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { getUserPreferences } from "@/core/functions/preferences"
import {
	hasIncomingInvites,
	useConnectionState,
} from "@/hooks/use-connection-state"
import {
	EntryDialog,
	getDefaultEntryInitial,
} from "../app/-components/EntryDialog"
import { useEntryMutations } from "../app/-components/useEntryMutations"

export function MobileAppNav() {
	const [dialogOpen, setDialogOpen] = React.useState(false)
	const location = useRouterState({ select: (state) => state.location })

	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const defaultCurrency = (prefsQuery.data?.defaultEntryCurrency ??
		prefsQuery.data?.displayCurrency ??
		"USD") as Currency

	const entryInitial = React.useMemo(
		() => getDefaultEntryInitial({ defaultCurrency }),
		[defaultCurrency],
	)

	const { handleSubmit, handleSubmitRecurring, isPending } = useEntryMutations()

	const connectionStateQuery = useConnectionState()
	const hasIncoming = hasIncomingInvites(connectionStateQuery)
	const pathname = location.pathname
	const isOnAdvanced =
		pathname === "/app/advanced" || pathname.startsWith("/app/advanced/")
	const toggleTarget = isOnAdvanced ? "/app" : "/app/advanced"
	const ToggleIcon = isOnAdvanced
		? ListChevronsDownUpIcon
		: ListChevronsUpDownIcon
	const toggleLabel = isOnAdvanced ? "Back to dashboard" : "Go to advanced"

	return (
		<>
			<nav className="fixed bottom-0 z-20 flex h-16 w-full items-center justify-between bg-background/90 backdrop-blur-xl">
				<div className="flex flex-1 justify-center">
					<Button aria-label={toggleLabel} asChild size="icon" variant="ghost">
						<Link to={toggleTarget}>
							<ToggleIcon className="size-5" />
						</Link>
					</Button>
				</div>
				<Separator orientation="vertical" />
				<div className="flex flex-1 justify-center">
					<Button
						aria-label="Add entry"
						onClick={() => setDialogOpen(true)}
						size="icon"
					>
						<PlusIcon className="size-5" />
					</Button>
				</div>
				<Separator orientation="vertical" />
				<div className="flex flex-1 justify-center">
					<Button aria-label="Settings" asChild size="icon" variant="ghost">
						<Link className="relative" to="/app/settings">
							<SettingsIcon className="size-5" />
							{hasIncoming && (
								<span className="-right-0.5 absolute top-0 size-2 rounded-full bg-destructive" />
							)}
						</Link>
					</Button>
				</div>
			</nav>
			<EntryDialog
				initial={entryInitial}
				isPending={isPending}
				onOpenChange={setDialogOpen}
				onSubmit={(state) => {
					handleSubmit(state)
					setDialogOpen(false)
				}}
				onSubmitRecurring={(state) => {
					handleSubmitRecurring(state)
					setDialogOpen(false)
				}}
				open={dialogOpen}
			/>
		</>
	)
}
