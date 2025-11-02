import { useQuery } from "@tanstack/react-query"
import * as React from "react"
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
import { getUserPreferences } from "@/core/functions/preferences"
import { useOptimisticPreferences } from "../../-hooks/use-optimistic-preferences"

type PrefsState = {
	reportsDailyEnabled: boolean
	reportsWeeklyEnabled: boolean
	reportsMonthlyEnabled: boolean
	reportsTime: string
	reportsWeeklyDay: number
}

const WEEKDAYS = [
	{ value: 0, label: "Sunday" },
	{ value: 1, label: "Monday" },
	{ value: 2, label: "Tuesday" },
	{ value: 3, label: "Wednesday" },
	{ value: 4, label: "Thursday" },
	{ value: 5, label: "Friday" },
	{ value: 6, label: "Saturday" },
] as const

export function ReportsSection() {
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const mutation = useOptimisticPreferences()

	const current: PrefsState = prefsQuery.data
		? {
				reportsDailyEnabled: prefsQuery.data.reportsDailyEnabled ?? false,
				reportsWeeklyEnabled: prefsQuery.data.reportsWeeklyEnabled ?? false,
				reportsMonthlyEnabled: prefsQuery.data.reportsMonthlyEnabled ?? false,
				reportsTime: prefsQuery.data.reportsTime ?? "20:00",
				reportsWeeklyDay: prefsQuery.data.reportsWeeklyDay ?? 0,
			}
		: {
				reportsDailyEnabled: false,
				reportsWeeklyEnabled: false,
				reportsMonthlyEnabled: false,
				reportsTime: "20:00",
				reportsWeeklyDay: 0,
			}

	const updatePref = React.useCallback(
		(patch: Partial<PrefsState>) => {
			mutation.mutate(patch)
		},
		[mutation],
	)

	return (
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
					<FieldDescription>Sent on selected day each week</FieldDescription>
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
							{WEEKDAYS.map((day) => (
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
	)
}
