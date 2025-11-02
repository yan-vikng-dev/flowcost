import type { currencies } from "@repo/shared-lib"
import { useQuery } from "@tanstack/react-query"
import * as React from "react"
import { useTimezoneSelect } from "react-timezone-select"
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox"
import { TimezoneCombobox } from "@/components/combobox/TimezoneCombobox"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldTitle } from "@/components/ui/field"
import { getUserPreferences } from "@/core/functions/preferences"
import { useOptimisticPreferences } from "../-hooks/use-optimistic-preferences"

type Currency = (typeof currencies)[number]
type PrefsState = {
	defaultEntryCurrency: Currency
	displayCurrency: Currency
	timezone: string
}

export function PreferencesCard() {
	const prefsQuery = useQuery({
		queryKey: ["userPreferences"],
		queryFn: () => getUserPreferences(),
		staleTime: 5 * 60 * 1000,
	})

	const mutation = useOptimisticPreferences()

	const current: PrefsState = prefsQuery.data
		? {
				defaultEntryCurrency: prefsQuery.data.defaultEntryCurrency,
				displayCurrency: prefsQuery.data.displayCurrency,
				timezone: prefsQuery.data.timezone,
			}
		: {
				defaultEntryCurrency: "USD",
				displayCurrency: "USD",
				timezone: "UTC",
			}

	const { options: timezoneOptions } = useTimezoneSelect({
		labelStyle: "original",
	})

	const updatePref = React.useCallback(
		(patch: Partial<PrefsState>) => {
			mutation.mutate(patch)
		},
		[mutation],
	)

	return (
		<Card>
			<CardHeader>
				<CardTitle>Preferences</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid gap-6">
					<Field orientation="horizontal">
						<FieldTitle>Theme</FieldTitle>
						<ThemeToggle />
					</Field>

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
									onChange={(v) => updatePref({ timezone: v })}
									options={timezoneOptions}
									placeholder={placeholder}
									value={hasCurated ? current.timezone : "__placeholder__"}
								/>
							)
						})()}
					</Field>
				</div>
			</CardContent>
		</Card>
	)
}
