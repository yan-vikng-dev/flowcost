import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserPreferences, updateUserPreferences, type UpdateUserPreferencesInput } from "@/core/functions/preferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { currencies } from "@repo/shared-config";

export const Route = createFileRoute("/_auth/app/settings/preferences")({
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const prefsQuery = useQuery({
    queryKey: ["userPreferences"],
    queryFn: () => getUserPreferences(),
    staleTime: 5 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (input: UpdateUserPreferencesInput) => updateUserPreferences({ data: input }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["userPreferences"] }),
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
      ])
    },
  });

  const current = prefsQuery.data ?? { defaultEntryCurrency: "USD", displayCurrency: "USD" };
  const [local, setLocal] = React.useState(current);

  React.useEffect(() => {
    if (prefsQuery.data) setLocal(prefsQuery.data);
  }, [prefsQuery.data]);

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>User Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Default Entry Currency</Label>
            <Select
              value={local.defaultEntryCurrency}
              onValueChange={(v) => setLocal((s) => ({ ...s, defaultEntryCurrency: v as typeof s.defaultEntryCurrency }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Display Currency</Label>
            <Select
              value={local.displayCurrency}
              onValueChange={(v) => setLocal((s) => ({ ...s, displayCurrency: v as typeof s.displayCurrency }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {currencies.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setLocal(current)}
              disabled={mutation.isPending}
            >
              Reset
            </Button>
            <Button
              onClick={() => mutation.mutate(local)}
              disabled={mutation.isPending || !local.defaultEntryCurrency || !local.displayCurrency}
            >
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


