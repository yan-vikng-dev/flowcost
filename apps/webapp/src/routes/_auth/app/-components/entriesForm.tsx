import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { categories, SERVICE_START_DATE } from "@repo/shared-config";
import { getUserPreferences } from "@/core/functions/preferences";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { createEntry, type CreateEntryInput } from "@/core/functions/entries";
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox";
import { EntryTypeCombobox } from "@/components/combobox/EntryTypeCombobox";
import { CategoryCombobox } from "@/components/combobox/CategoryCombobox";
import { ChevronDownIcon } from "lucide-react";

export function EntriesForm() {
  const queryClient = useQueryClient();
  const prefsQuery = useQuery({
    queryKey: ["userPreferences"],
    queryFn: () => getUserPreferences(),
    staleTime: 5 * 60 * 1000,
  });
  const [submittedOnce, setSubmittedOnce] = useState(false);
  type EntriesFormState = Omit<CreateEntryInput, "amount"> & { amount: number | "" };
  const defaultForm: EntriesFormState = {
    amount: "",
    currency: prefsQuery.data?.defaultEntryCurrency ?? "USD",
    category: categories[0],
    entryType: "Expense",
    description: "",
    executedAt: new Date(),
  };

  const form = useForm({
    defaultValues: defaultForm,
    onSubmit: async ({ value }) => {
      const amount = typeof value.amount === "string" ? parseFloat(value.amount) : value.amount;
      const payload: CreateEntryInput = {
        ...value,
        amount,
      };
      await createEntry({ data: payload });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["monthlyEntriesForCharts"] }),
      ]);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setSubmittedOnce(true);
            void form.handleSubmit();
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-[max-content_1fr] sm:grid-cols-[14rem_1fr] items-end gap-4">
            <div className="grid gap-2">
              <Label>Type</Label>
              <form.Field name="entryType">
                {(field) => (
                  <>
                    <EntryTypeCombobox
                      className="w-auto sm:w-full"
                      value={field.state.value}
                      onChange={(val) => field.handleChange(val)}
                    />
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">
                          {String(error)}
                        </div>
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
                      return "Please select a valid date";
                    }
                    if (value < SERVICE_START_DATE) {
                      return `Date cannot be earlier than ${SERVICE_START_DATE.toLocaleDateString()}`;
                    }
                  },
                }}
              >
                {(field) => (
                  <>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          id="executedAt"
                          data-placeholder={field.state.value ? undefined : true}
                          className={cn(
                            "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50",
                            "flex w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9 font-normal",
                          )}
                        >
                          {field.state.value
                            ? new Date(field.state.value).toLocaleDateString()
                            : "Select date"}
                          <ChevronDownIcon className="size-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            field.state.value instanceof Date ? field.state.value : undefined
                          }
                          onSelect={(date) => {
                            if (!date) return;
                            field.handleChange(date);
                          }}
                          startMonth={SERVICE_START_DATE}
                        />
                      </PopoverContent>
                    </Popover>
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">
                          {String(error)}
                        </div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>
          </div>

          {/* Row 2: Currency, Amount */}
          <div className="grid grid-cols-[max-content_1fr] sm:grid-cols-[14rem_1fr] items-end gap-4">
            <div className="grid gap-2">
              <Label>Currency</Label>
              <form.Field name="currency">
                {(field) => (
                  <>
                    <CurrencyCombobox
                      className="w-auto sm:w-full"
                      value={field.state.value}
                      onChange={(val) => field.handleChange(val)}
                    />
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">
                          {String(error)}
                        </div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>
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
                        const raw = e.currentTarget.value;
                        if (raw === "") {
                          field.handleChange("");
                          return;
                        }
                        const next = e.currentTarget.valueAsNumber;
                        field.handleChange(Number.isNaN(next) ? "" : next);
                      }}
                    />
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">
                          {String(error)}
                        </div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>
          </div>

          {/* Row 3: Category, Description */}
          <div className="grid grid-cols-[max-content_1fr] sm:grid-cols-[14rem_1fr] items-end gap-4">
            <div className="grid gap-2">
              <Label>Category</Label>
              <form.Field name="category">
                {(field) => (
                  <>
                    <CategoryCombobox
                      className="w-auto sm:w-full"
                      value={field.state.value}
                      onChange={(val) => field.handleChange(val)}
                    />
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">
                          {String(error)}
                        </div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <form.Field name="description">
                {(field) => (
                  <>
                    <Input
                      id="description"
                      placeholder="(Optional) Additional details"
                      value={field.state.value ?? ""}
                      onChange={(e) => field.handleChange(e.currentTarget.value)}
                    />
                    {submittedOnce &&
                      field.state.meta.errors.map((error, idx) => (
                        <div key={idx} className="text-sm text-red-500">
                          {String(error)}
                        </div>
                      ))}
                  </>
                )}
              </form.Field>
            </div>
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
  );
}
