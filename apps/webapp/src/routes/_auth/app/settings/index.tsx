import type { currencies } from "@repo/shared-lib"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import * as React from "react"
import { useTimezoneSelect } from "react-timezone-select"
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox"
import { TimezoneCombobox } from "@/components/combobox/TimezoneCombobox"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldSeparator,
	FieldTitle,
} from "@/components/ui/field"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { TimePicker } from "@/components/ui/time-picker"
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
import { formatPhoneNumber } from "@/utils/phone"
import { ConnectionField } from "./-components/ConnectionField"
import { IncomingInviteCard } from "./-components/IncomingInviteCard"

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

	type Currency = (typeof currencies)[number]
	type PrefsState = {
		defaultEntryCurrency: Currency
		displayCurrency: Currency
		timezone: string
		reportsDailyEnabled: boolean
		reportsWeeklyEnabled: boolean
		reportsMonthlyEnabled: boolean
		reportsTime: string
		reportsWeeklyDay: number
	}

	const [linkInitiatedAt, setLinkInitiatedAt] = React.useState<number | null>(
		null,
	)
	const [unlinkOpen, setUnlinkOpen] = React.useState(false)

	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const mutation = useMutation({
		mutationFn: (input: UpdateUserPreferencesInput) =>
			updateUserPreferences({ data: input }),
		// Cancel any in-flight mutations when a new one starts
		onMutate: async (newData) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({ queryKey: ["userPreferences"] })

			// Snapshot the previous value (raw database type)
			const previousPrefs = queryClient.getQueryData<
				Awaited<ReturnType<typeof getUserPreferences>>
			>(["userPreferences"])

			// Optimistically update to the new value
			if (previousPrefs) {
				// Merge new data with existing preferences
				const optimisticPrefs = {
					...previousPrefs,
					...(newData.defaultEntryCurrency !== undefined && {
						defaultEntryCurrency: newData.defaultEntryCurrency,
					}),
					...(newData.displayCurrency !== undefined && {
						displayCurrency: newData.displayCurrency,
					}),
					...(newData.timezone !== undefined && { timezone: newData.timezone }),
					...(newData.reportsDailyEnabled !== undefined && {
						reportsDailyEnabled: newData.reportsDailyEnabled,
					}),
					...(newData.reportsWeeklyEnabled !== undefined && {
						reportsWeeklyEnabled: newData.reportsWeeklyEnabled,
					}),
					...(newData.reportsMonthlyEnabled !== undefined && {
						reportsMonthlyEnabled: newData.reportsMonthlyEnabled,
					}),
					...(newData.reportsTime !== undefined && {
						reportsTime: newData.reportsTime,
					}),
					...(newData.reportsWeeklyDay !== undefined && {
						reportsWeeklyDay: newData.reportsWeeklyDay,
					}),
				}
				queryClient.setQueryData(["userPreferences"], optimisticPrefs)
			}

			// Return a context object with the snapshotted value
			return { previousPrefs }
		},
		// If the mutation fails, use the context returned from onMutate to roll back
		onError: (_err, _newData, context) => {
			if (context?.previousPrefs) {
				queryClient.setQueryData(["userPreferences"], context.previousPrefs)
			}
		},
		// Always refetch after error or success to ensure consistency
		onSettled: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["userPreferences"] }),
				queryClient.invalidateQueries({ queryKey: ["entries"] }),
			])
		},
	})

	const whatsappStatusQuery = useQuery({
		queryKey: ["whatsappLinkStatus"],
		queryFn: () => getWhatsappLinkStatus(),
		staleTime: 60 * 1000,
		refetchInterval: (query) => {
			// Poll every 2 seconds if user just initiated a link and it's not yet linked
			if (
				linkInitiatedAt !== null &&
				!query.state.data?.linked &&
				Date.now() - linkInitiatedAt < 5 * 60 * 1000
			) {
				return 2000
			}
			return false
		},
	})

	const startLinkMutation = useMutation({
		mutationFn: async () => {
			const res = await startWhatsappLink()
			if (res?.url) {
				window.open(res.url, "_blank")
			}
		},
		onSuccess: async () => {
			setLinkInitiatedAt(Date.now())
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

	const current: PrefsState = prefsQuery.data
		? {
				defaultEntryCurrency: prefsQuery.data.defaultEntryCurrency,
				displayCurrency: prefsQuery.data.displayCurrency,
				timezone: prefsQuery.data.timezone,
				reportsDailyEnabled: prefsQuery.data.reportsDailyEnabled ?? false,
				reportsWeeklyEnabled: prefsQuery.data.reportsWeeklyEnabled ?? false,
				reportsMonthlyEnabled: prefsQuery.data.reportsMonthlyEnabled ?? false,
				reportsTime: prefsQuery.data.reportsTime ?? "20:00",
				reportsWeeklyDay: prefsQuery.data.reportsWeeklyDay ?? 0,
			}
		: {
				defaultEntryCurrency: "USD",
				displayCurrency: "USD",
				timezone: "UTC",
				reportsDailyEnabled: false,
				reportsWeeklyEnabled: false,
				reportsMonthlyEnabled: false,
				reportsTime: "20:00",
				reportsWeeklyDay: 0,
			}

	const { options: timezoneOptions } = useTimezoneSelect({
		labelStyle: "original",
	})

	const updatePref = React.useCallback(
		(patch: Partial<PrefsState>) => {
			// Convert patch to UpdateUserPreferencesInput (only include defined fields)
			const mergedPatch: UpdateUserPreferencesInput = {
				...(patch.defaultEntryCurrency !== undefined && {
					defaultEntryCurrency: patch.defaultEntryCurrency,
				}),
				...(patch.displayCurrency !== undefined && {
					displayCurrency: patch.displayCurrency,
				}),
				...(patch.timezone !== undefined && { timezone: patch.timezone }),
				...(patch.reportsDailyEnabled !== undefined && {
					reportsDailyEnabled: patch.reportsDailyEnabled,
				}),
				...(patch.reportsWeeklyEnabled !== undefined && {
					reportsWeeklyEnabled: patch.reportsWeeklyEnabled,
				}),
				...(patch.reportsMonthlyEnabled !== undefined && {
					reportsMonthlyEnabled: patch.reportsMonthlyEnabled,
				}),
				...(patch.reportsTime !== undefined && {
					reportsTime: patch.reportsTime,
				}),
				...(patch.reportsWeeklyDay !== undefined && {
					reportsWeeklyDay: patch.reportsWeeklyDay,
				}),
			}

			// The mutation will handle optimistic updates via onMutate
			// onMutate will cancel any in-flight queries and update optimistically
			mutation.mutate(mergedPatch)
		},
		[mutation],
	)

	React.useEffect(() => {
		// Stop polling once linked
		if (whatsappStatusQuery.data?.linked && linkInitiatedAt !== null) {
			setLinkInitiatedAt(null)
		}
	}, [whatsappStatusQuery.data?.linked, linkInitiatedAt])

	const weekdays = [
		{ value: 0, label: "Sunday" },
		{ value: 1, label: "Monday" },
		{ value: 2, label: "Tuesday" },
		{ value: 3, label: "Wednesday" },
		{ value: 4, label: "Thursday" },
		{ value: 5, label: "Friday" },
		{ value: 6, label: "Saturday" },
	] as const

	return (
		<div className="mx-auto grid max-w-xl gap-6">
			<IncomingInviteCard />

			<Card>
				<CardHeader>
					<CardTitle>Preferences</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						<Field orientation="horizontal">
							<FieldTitle>Default Entry Currency</FieldTitle>
							<CurrencyCombobox
								onChange={(val) => updatePref({ defaultEntryCurrency: val })}
								value={current.defaultEntryCurrency}
							/>
						</Field>

						<Field orientation="horizontal">
							<FieldTitle>Display Currency</FieldTitle>
							<CurrencyCombobox
								onChange={(val) => updatePref({ displayCurrency: val })}
								value={current.displayCurrency}
							/>
						</Field>

						<Field orientation="horizontal">
							<FieldTitle>Timezone</FieldTitle>
							{(() => {
								const hasCurated = timezoneOptions.some(
									(opt) => opt.value === (current.timezone ?? ""),
								)
								const placeholder = current.timezone ?? "UTC"
								return (
									<TimezoneCombobox
										// If current value not in curated list, show placeholder and wait for selection
										onChange={(v) => updatePref({ timezone: v })}
										options={timezoneOptions}
										placeholder={placeholder}
										value={hasCurated ? current.timezone : "__placeholder__"}
									/>
								)
							})()}
						</Field>

						<ConnectionField />
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Assistant</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid gap-6">
						<Field orientation="horizontal">
							<FieldContent>
								<FieldTitle>WhatsApp</FieldTitle>
								<FieldDescription>
									{whatsappStatusQuery.isLoading
										? "Checking status..."
										: whatsappStatusQuery.data?.linked
											? `Linked to ${formatPhoneNumber(whatsappStatusQuery.data.waId)}`
											: "Not linked"}
								</FieldDescription>
							</FieldContent>
							<Button
								disabled={
									whatsappStatusQuery.isLoading ||
									(whatsappStatusQuery.data?.linked
										? unlinkMutation.isPending
										: startLinkMutation.isPending)
								}
								onClick={() => {
									if (whatsappStatusQuery.data?.linked) {
										setUnlinkOpen(true)
									} else {
										startLinkMutation.mutate()
									}
								}}
								variant="outline"
							>
								{whatsappStatusQuery.isLoading ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Checking...
									</>
								) : whatsappStatusQuery.data?.linked ? (
									unlinkMutation.isPending ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											Unlinking...
										</>
									) : (
										"Unlink"
									)
								) : startLinkMutation.isPending ? (
									<>
										<Loader2 className="size-4 animate-spin" />
										Opening...
									</>
								) : (
									"Link WhatsApp"
								)}
							</Button>
						</Field>

						<AlertDialog onOpenChange={setUnlinkOpen} open={unlinkOpen}>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Unlink WhatsApp?</AlertDialogTitle>
									<AlertDialogDescription>
										This will remove your WhatsApp link. You can link it again
										later.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel onClick={() => setUnlinkOpen(false)}>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										disabled={unlinkMutation.isPending}
										onClick={() => {
											unlinkMutation.mutate()
										}}
									>
										{unlinkMutation.isPending ? (
											<>
												<Loader2 className="size-4 animate-spin" />
												Unlinking...
											</>
										) : (
											"Unlink"
										)}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>

						{whatsappStatusQuery.data?.linked && (
							<>
								<FieldSeparator />

								<Field orientation="horizontal">
									<FieldContent>
										<FieldTitle>Monthly Reports</FieldTitle>
										<FieldDescription>
											Sent on the last day of each month
										</FieldDescription>
									</FieldContent>
									<Switch
										checked={current.reportsMonthlyEnabled}
										onCheckedChange={(checked) =>
											updatePref({ reportsMonthlyEnabled: checked })
										}
									/>
								</Field>

								<Field orientation="horizontal">
									<FieldContent>
										<FieldTitle>Weekly Reports</FieldTitle>
										<FieldDescription>
											Sent on selected day each week
										</FieldDescription>
									</FieldContent>
									<Switch
										checked={current.reportsWeeklyEnabled}
										onCheckedChange={(checked) =>
											updatePref({ reportsWeeklyEnabled: checked })
										}
									/>
								</Field>

								<Field orientation="horizontal">
									<FieldContent>
										<FieldTitle>Daily Reports</FieldTitle>
										<FieldDescription>Sent every day</FieldDescription>
									</FieldContent>
									<Switch
										checked={current.reportsDailyEnabled}
										onCheckedChange={(checked) =>
											updatePref({ reportsDailyEnabled: checked })
										}
									/>
								</Field>

								{current.reportsWeeklyEnabled && (
									<Field orientation="horizontal">
										<FieldContent>
											<FieldTitle>Weekly Day</FieldTitle>
											<FieldDescription>
												Day of the week to send weekly reports
											</FieldDescription>
										</FieldContent>
										<Select
											onValueChange={(val) =>
												updatePref({
													reportsWeeklyDay: Number.parseInt(val, 10),
												})
											}
											value={String(current.reportsWeeklyDay)}
										>
											<SelectTrigger className="min-w-[7.5rem]">
												<SelectValue placeholder="Select day" />
											</SelectTrigger>
											<SelectContent>
												{weekdays.map((day) => (
													<SelectItem key={day.value} value={String(day.value)}>
														{day.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</Field>
								)}

								{(current.reportsDailyEnabled ||
									current.reportsWeeklyEnabled ||
									current.reportsMonthlyEnabled) && (
									<Field orientation="horizontal">
										<FieldTitle>Report Time</FieldTitle>
										<TimePicker
											onChange={(value) => updatePref({ reportsTime: value })}
											value={current.reportsTime}
										/>
									</Field>
								)}
							</>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
