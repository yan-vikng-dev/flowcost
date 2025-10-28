import type { currencies } from "@repo/shared-config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import * as React from "react"
import { useTimezoneSelect } from "react-timezone-select"
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox"
import { TimezoneCombobox } from "@/components/combobox/TimezoneCombobox"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldTitle,
} from "@/components/ui/field"
import {
	getUserPreferences,
	type UpdateUserPreferencesInput,
	updateUserPreferences,
} from "@/core/functions/preferences"
import {
	getWhatsappLinkStatus,
	startWhatsappLink,
	unlinkWhatsapp,
} from "@/core/functions/whatsapp"
import { ConnectionsCard } from "./-components/ConnectionsCard"

export const Route = createFileRoute("/_auth/app/settings/")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData({
				queryKey: ["userPreferences"],
				queryFn: () => getUserPreferences(),
			}),
			context.queryClient.ensureQueryData({
				queryKey: ["whatsappLinkStatus"],
				queryFn: () => getWhatsappLinkStatus(),
			}),
			context.queryClient.ensureQueryData({
				queryKey: ["connectionState"],
				queryFn: async () => {
					const mod = await import("./-functions/connections")
					return mod.getConnectionState()
				},
			}),
		])
	},
	component: RouteComponent,
})

function RouteComponent() {
	const queryClient = useQueryClient()
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const mutation = useMutation({
		mutationFn: (input: UpdateUserPreferencesInput) =>
			updateUserPreferences({ data: input }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["userPreferences"] }),
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
				queryClient.invalidateQueries({
					queryKey: ["monthlyEntriesForCharts"],
				}),
			])
		},
	})

	const whatsappStatusQuery = useQuery({
		queryKey: ["whatsappLinkStatus"],
		queryFn: () => getWhatsappLinkStatus(),
		staleTime: 60 * 1000,
	})

	const startLinkMutation = useMutation({
		mutationFn: async () => {
			const res = await startWhatsappLink()
			if (res?.url) {
				window.open(res.url, "_blank")
			}
		},
		onSuccess: async () => {
			await whatsappStatusQuery.refetch()
		},
	})

	const unlinkMutation = useMutation({
		mutationFn: async () => {
			await unlinkWhatsapp()
		},
		onSuccess: async () => {
			await whatsappStatusQuery.refetch()
			setUnlinkOpen(false)
		},
	})

	type Currency = (typeof currencies)[number]
	type PrefsState = {
		defaultEntryCurrency: Currency
		displayCurrency: Currency
		timezone: string
	}

	const current: PrefsState = prefsQuery.data
		? {
				defaultEntryCurrency: prefsQuery.data.defaultEntryCurrency,
				displayCurrency: prefsQuery.data.displayCurrency,
				timezone: prefsQuery.data.timezone,
			}
		: { defaultEntryCurrency: "USD", displayCurrency: "USD", timezone: "UTC" }

	const [local, setLocal] = React.useState<PrefsState>(current)
	const [unlinkOpen, setUnlinkOpen] = React.useState(false)

	const { options: timezoneOptions } = useTimezoneSelect({
		labelStyle: "original",
	})

	const updatePref = React.useCallback(
		(patch: Partial<PrefsState>) => {
			const next: PrefsState = {
				defaultEntryCurrency:
					patch.defaultEntryCurrency ?? local.defaultEntryCurrency,
				displayCurrency: patch.displayCurrency ?? local.displayCurrency,
				timezone: patch.timezone ?? local.timezone ?? "UTC",
			}
			const prev = local
			setLocal(next)
			// Persist immediately
			mutation.mutate(next, {
				onError: () => {
					setLocal(prev)
				},
			})
		},
		[local, mutation],
	)

	React.useEffect(() => {
		if (prefsQuery.data) {
			setLocal({
				defaultEntryCurrency: prefsQuery.data.defaultEntryCurrency,
				displayCurrency: prefsQuery.data.displayCurrency,
				timezone: prefsQuery.data.timezone,
			})
		}
	}, [prefsQuery.data])

	return (
		<div className="mx-auto grid max-w-xl gap-6">
			<Card>
				<CardHeader>
					<CardTitle>User Preferences</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						<Field orientation="horizontal">
							<FieldTitle>Default Entry Currency</FieldTitle>
							<CurrencyCombobox
								onChange={(val) => updatePref({ defaultEntryCurrency: val })}
								value={local.defaultEntryCurrency}
							/>
						</Field>

						<Field orientation="horizontal">
							<FieldTitle>Display Currency</FieldTitle>
							<CurrencyCombobox
								onChange={(val) => updatePref({ displayCurrency: val })}
								value={local.displayCurrency}
							/>
						</Field>

						<Field orientation="horizontal">
							<FieldTitle>Timezone</FieldTitle>
							{(() => {
								const hasCurated = timezoneOptions.some(
									(opt) => opt.value === (local.timezone ?? ""),
								)
								const placeholder = local.timezone ?? "UTC"
								return (
									<TimezoneCombobox
										// If current value not in curated list, show placeholder and wait for selection
										onChange={(v) => updatePref({ timezone: v })}
										options={timezoneOptions}
										placeholder={placeholder}
										value={hasCurated ? local.timezone : "__placeholder__"}
									/>
								)
							})()}
						</Field>

						<Field orientation="horizontal">
							<FieldContent>
								<FieldTitle>WhatsApp</FieldTitle>
								<FieldDescription>
									{whatsappStatusQuery.isLoading
										? "Checking status..."
										: whatsappStatusQuery.data?.linked
											? `Linked to ${whatsappStatusQuery.data.waId}`
											: "Not linked"}
								</FieldDescription>
							</FieldContent>
							<Button
								disabled={
									whatsappStatusQuery.data?.linked
										? unlinkMutation.isPending
										: startLinkMutation.isPending
								}
								onClick={() => {
									if (whatsappStatusQuery.data?.linked) {
										setUnlinkOpen(true)
									} else {
										startLinkMutation.mutate()
									}
								}}
								variant="secondary"
							>
								{whatsappStatusQuery.data?.linked
									? unlinkMutation.isPending
										? "Unlinking..."
										: "Unlink WhatsApp"
									: startLinkMutation.isPending
										? "Opening..."
										: "Link WhatsApp"}
							</Button>
						</Field>

						<Dialog onOpenChange={setUnlinkOpen} open={unlinkOpen}>
							<DialogContent>
								<DialogHeader>
									<DialogTitle>Unlink WhatsApp?</DialogTitle>
									<DialogDescription>
										This will remove your WhatsApp link. You can link it again
										later.
									</DialogDescription>
								</DialogHeader>
								<DialogFooter>
									<Button onClick={() => setUnlinkOpen(false)} variant="ghost">
										Cancel
									</Button>
									<Button
										disabled={unlinkMutation.isPending}
										onClick={() => unlinkMutation.mutate()}
										variant="destructive"
									>
										{unlinkMutation.isPending ? "Unlinking..." : "Unlink"}
									</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						{/* Per-field autosave; no global Save/Reset controls */}
					</div>
				</CardContent>
			</Card>
			<ConnectionsCard />
		</div>
	)
}
