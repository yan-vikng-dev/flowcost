import type { currencies } from "@repo/shared-config"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
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
		reportsDailyEnabled: boolean
		reportsWeeklyEnabled: boolean
		reportsMonthlyEnabled: boolean
		reportsTime: string
		reportsWeeklyDay: number
	}

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

	const [local, setLocal] = React.useState<PrefsState>(current)
	const [unlinkOpen, setUnlinkOpen] = React.useState(false)
	const [linkWhatsappAlertOpen, setLinkWhatsappAlertOpen] = React.useState(false)

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
				reportsDailyEnabled:
					patch.reportsDailyEnabled ?? local.reportsDailyEnabled,
				reportsWeeklyEnabled:
					patch.reportsWeeklyEnabled ?? local.reportsWeeklyEnabled,
				reportsMonthlyEnabled:
					patch.reportsMonthlyEnabled ?? local.reportsMonthlyEnabled,
				reportsTime: patch.reportsTime ?? local.reportsTime ?? "20:00",
				reportsWeeklyDay: patch.reportsWeeklyDay ?? local.reportsWeeklyDay ?? 0,
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

	const handleReportToggle = React.useCallback(
		(
			field: "reportsDailyEnabled" | "reportsWeeklyEnabled" | "reportsMonthlyEnabled",
			checked: boolean,
		) => {
			const isLinked = whatsappStatusQuery.data?.linked ?? false
			if (checked && !isLinked) {
				setLinkWhatsappAlertOpen(true)
				return
			}
			updatePref({ [field]: checked })
		},
		[whatsappStatusQuery.data?.linked, updatePref],
	)

	React.useEffect(() => {
		if (prefsQuery.data) {
			setLocal({
				defaultEntryCurrency: prefsQuery.data.defaultEntryCurrency,
				displayCurrency: prefsQuery.data.displayCurrency,
				timezone: prefsQuery.data.timezone,
				reportsDailyEnabled: prefsQuery.data.reportsDailyEnabled ?? false,
				reportsWeeklyEnabled: prefsQuery.data.reportsWeeklyEnabled ?? false,
				reportsMonthlyEnabled: prefsQuery.data.reportsMonthlyEnabled ?? false,
				reportsTime: prefsQuery.data.reportsTime ?? "20:00",
				reportsWeeklyDay: prefsQuery.data.reportsWeeklyDay ?? 0,
			})
		}
	}, [prefsQuery.data])

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
											? `Linked to ${whatsappStatusQuery.data.waId}`
											: "Not linked"}
								</FieldDescription>
							</FieldContent>
							<Button
								className="self-center"
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
								variant="outline"
							>
								{whatsappStatusQuery.data?.linked
									? unlinkMutation.isPending
										? "Unlinking..."
										: "Unlink"
									: startLinkMutation.isPending
										? "Opening..."
										: "Link WhatsApp"}
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
											setUnlinkOpen(false)
										}}
									>
										{unlinkMutation.isPending ? "Unlinking..." : "Unlink"}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>

						<AlertDialog
							onOpenChange={setLinkWhatsappAlertOpen}
							open={linkWhatsappAlertOpen}
						>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Link WhatsApp First</AlertDialogTitle>
									<AlertDialogDescription>
										You need to link your WhatsApp number before enabling reports.
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<AlertDialogCancel onClick={() => setLinkWhatsappAlertOpen(false)}>
										Cancel
									</AlertDialogCancel>
									<AlertDialogAction
										disabled={startLinkMutation.isPending}
										onClick={() => {
											setLinkWhatsappAlertOpen(false)
											startLinkMutation.mutate()
										}}
									>
										{startLinkMutation.isPending ? "Opening..." : "Link WhatsApp"}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>

						<FieldSeparator>Reports</FieldSeparator>

						<Field orientation="horizontal">
							<FieldContent>
								<FieldTitle>Monthly Reports</FieldTitle>
								<FieldDescription>
									Sent on the last day of each month
								</FieldDescription>
							</FieldContent>
							<Switch
								checked={local.reportsMonthlyEnabled}
								onCheckedChange={(checked) =>
									handleReportToggle("reportsMonthlyEnabled", checked)
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
								checked={local.reportsWeeklyEnabled}
								onCheckedChange={(checked) =>
									handleReportToggle("reportsWeeklyEnabled", checked)
								}
							/>
						</Field>

						<Field orientation="horizontal">
							<FieldContent>
								<FieldTitle>Daily Reports</FieldTitle>
								<FieldDescription>Sent every day</FieldDescription>
							</FieldContent>
							<Switch
								checked={local.reportsDailyEnabled}
								onCheckedChange={(checked) =>
									handleReportToggle("reportsDailyEnabled", checked)
								}
							/>
						</Field>

						<Field orientation="horizontal">
							<FieldContent>
								<FieldTitle>Weekly Day</FieldTitle>
								<FieldDescription>
									Day of the week to send weekly reports
								</FieldDescription>
							</FieldContent>
							<Select
								disabled={!local.reportsWeeklyEnabled}
								onValueChange={(val) =>
									updatePref({ reportsWeeklyDay: Number.parseInt(val, 10) })
								}
								value={String(local.reportsWeeklyDay)}
							>
								<SelectTrigger className="w-[180px]">
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

						<Field orientation="horizontal">
							<FieldTitle>Report Time</FieldTitle>
							<TimePicker
								onChange={(value) => updatePref({ reportsTime: value })}
								value={local.reportsTime}
							/>
						</Field>
					</div>
				</CardContent>
			</Card>

			<ConnectionsCard />
		</div>
	)
}
