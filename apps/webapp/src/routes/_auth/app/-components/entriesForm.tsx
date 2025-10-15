import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { type Category, categories, type Currency, currencies, SERVICE_START_DATE } from "@repo/shared-config"
import { entryTypes, type EntryType } from "@repo/data-ops/drizzle/schemas/entries"
import { getUserPreferences } from "@/core/functions/preferences"
import { useQuery } from "@tanstack/react-query"
import { useQueryClient } from "@tanstack/react-query"
import { useForm } from "@tanstack/react-form"
import { createEntry, type CreateEntryInput } from "@/core/functions/entries"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"

export function EntriesForm() {
  const queryClient = useQueryClient()
  const prefsQuery = useQuery({
    queryKey: ["userPreferences"],
    queryFn: () => getUserPreferences(),
    staleTime: 5 * 60 * 1000,
  })
  const [submittedOnce, setSubmittedOnce] = useState(false)
  type EntriesFormState = Omit<CreateEntryInput, "amount"> & { amount: number | "" }
  const defaultForm: EntriesFormState = {
    amount: "",
    currency: prefsQuery.data?.defaultEntryCurrency ?? "USD",
    category: categories[0],
    type: "expense",
    description: "",
    executedAt: new Date(),
  }

  const form = useForm({
    defaultValues: defaultForm,
    onSubmit: async ({ value }) => {
      const amount = typeof value.amount === "string" ? parseFloat(value.amount) : value.amount
      const payload: CreateEntryInput = {
        ...value,
        amount,
      }
      await createEntry({ data: payload })
      await queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>Add Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setSubmittedOnce(true)
            form.handleSubmit()
          }}
          className="space-y-4"
        >
          <div className="grid gap-2">
            <Label htmlFor="amount">Amount</Label>
            <form.Field
              name="amount"
              validators={{
                onSubmit: ({ value }) =>
                  typeof value !== "number" || !Number.isFinite(value) || value <= 0
                    ? "Amount must be greater than 0"
                    : undefined,
              }}
            >
              {(field) => (
                <>
                  <Input
                    id="amount"
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    autoComplete="off"
                    value={field.state.value === "" ? "" : field.state.value}
                    onChange={(e) => {
                      const raw = e.currentTarget.value
                      if (raw === "") {
                        field.handleChange("")
                        return
                      }
                      const next = e.currentTarget.valueAsNumber
                      field.handleChange(Number.isNaN(next) ? "" : next)
                    }}
                  />
                  {submittedOnce &&
                    field.state.meta.errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-500">{String(error)}</div>
                    ))}
                </>
              )}
            </form.Field>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="executedAt">Date</Label>
            <form.Field
              name="executedAt"
              validators={{
                onChange: ({ value }) => {
                  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
                    return "Please select a valid date"
                  }
                  if (value < SERVICE_START_DATE) {
                    return `Date cannot be earlier than ${SERVICE_START_DATE.toLocaleDateString()}`
                  }
                },
              }}
            >
              {(field) => (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" id="executedAt" className="w-48 justify-between font-normal">
                        {field.state.value ? new Date(field.state.value).toLocaleDateString() : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.state.value instanceof Date ? field.state.value : undefined}
                        onSelect={(date) => {
                          if (!date) return
                          field.handleChange(date)
                        }}
                        startMonth={SERVICE_START_DATE}
                      />
                    </PopoverContent>
                  </Popover>
                  {submittedOnce &&
                    field.state.meta.errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-500">{String(error)}</div>
                    ))}
                </>
              )}
            </form.Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <form.Field name="type">
                {(field) => (
                  <>
                    <Select
                      value={field.state.value}
                      onValueChange={(val) => field.handleChange(val as EntryType)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {entryTypes.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">{String(error)}</div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>
            <div className="grid gap-2">
              <Label>Currency</Label>
              <form.Field name="currency">
                {(field) => (
                  <>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as Currency)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {currencies.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">{String(error)}</div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <form.Field name="category">
                {(field) => (
                  <>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value as Category)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">{String(error)}</div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <form.Field name="description">
              {(field) => (
                <>
                  <Input
                    id="description"
                    placeholder="What is this expense/income for?"
                    value={field.state.value ?? ""}
                    onChange={(e) => field.handleChange(e.currentTarget.value)}
                  />
                  {submittedOnce &&
                    field.state.meta.errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-500">{String(error)}</div>
                    ))}
                </>
              )}
            </form.Field>
          </div>

          

          {/* Form-level errors could be rendered here if needed */}

          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <div className="flex justify-end gap-2">
                <Button
                  type="reset"
                  variant="ghost"
                  onClick={() => form.reset()}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {isSubmitting ? "Saving..." : "Save"}
                </Button>
              </div>
            )}
          </form.Subscribe>
        </form>
      </CardContent>
    </Card>
  )
}
