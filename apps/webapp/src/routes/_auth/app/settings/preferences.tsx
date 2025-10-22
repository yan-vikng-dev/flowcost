import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getUserPreferences,
  updateUserPreferences,
  type UpdateUserPreferencesInput,
} from "@/core/functions/preferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { currencies } from "@repo/shared-config";
import { CurrencyCombobox } from "@/components/combobox/CurrencyCombobox";
import { TimezoneCombobox } from "@/components/combobox/TimezoneCombobox";
import {
  getWhatsappLinkStatus,
  startWhatsappLink,
  unlinkWhatsapp,
} from "@/core/functions/whatsapp";
import { useTimezoneSelect } from "react-timezone-select";

export const Route = createFileRoute("/_auth/app/settings/preferences")({
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
    ]);
  },
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
        queryClient.invalidateQueries({ queryKey: ["monthlyEntriesForCharts"] }),
      ]);
    },
  });

  const whatsappStatusQuery = useQuery({
    queryKey: ["whatsappLinkStatus"],
    queryFn: () => getWhatsappLinkStatus(),
    staleTime: 60 * 1000,
  });

  const startLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await startWhatsappLink();
      if (res?.url) {
        window.open(res.url, "_blank");
      }
    },
    onSuccess: async () => {
      await whatsappStatusQuery.refetch();
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      await unlinkWhatsapp();
    },
    onSuccess: async () => {
      await whatsappStatusQuery.refetch();
      setUnlinkOpen(false);
    },
  });

  type Currency = (typeof currencies)[number];
  type PrefsState = { defaultEntryCurrency: Currency; displayCurrency: Currency; timezone: string };

  const current: PrefsState = prefsQuery.data
    ? {
        defaultEntryCurrency: prefsQuery.data.defaultEntryCurrency,
        displayCurrency: prefsQuery.data.displayCurrency,
        timezone: prefsQuery.data.timezone,
      }
    : { defaultEntryCurrency: "USD", displayCurrency: "USD", timezone: "UTC" };

  const [local, setLocal] = React.useState<PrefsState>(current);
  const [unlinkOpen, setUnlinkOpen] = React.useState(false);

  const { options: timezoneOptions } = useTimezoneSelect({ labelStyle: "original" });

  const updatePref = React.useCallback(
    (patch: Partial<PrefsState>) => {
      const next: PrefsState = {
        defaultEntryCurrency: patch.defaultEntryCurrency ?? local.defaultEntryCurrency,
        displayCurrency: patch.displayCurrency ?? local.displayCurrency,
        timezone: patch.timezone ?? local.timezone ?? "UTC",
      };
      const prev = local;
      setLocal(next);
      // Persist immediately
      mutation.mutate(next, {
        onError: () => {
          setLocal(prev);
        },
      });
    },
    [local, mutation],
  );

  React.useEffect(() => {
    if (prefsQuery.data) {
      setLocal({
        defaultEntryCurrency: prefsQuery.data.defaultEntryCurrency,
        displayCurrency: prefsQuery.data.displayCurrency,
        timezone: prefsQuery.data.timezone,
      });
    }
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
            <CurrencyCombobox
              value={local.defaultEntryCurrency}
              onChange={(val) => updatePref({ defaultEntryCurrency: val })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Display Currency</Label>
            <CurrencyCombobox
              value={local.displayCurrency}
              onChange={(val) => updatePref({ displayCurrency: val })}
            />
          </div>

          <div className="grid gap-2">
            <Label>Timezone</Label>
            {(() => {
              const hasCurated = timezoneOptions.some(
                (opt) => opt.value === (local.timezone ?? ""),
              );
              const placeholder = local.timezone ?? "UTC";
              return (
                <TimezoneCombobox
                  // If current value not in curated list, show placeholder and wait for selection
                  value={hasCurated ? local.timezone : "__placeholder__"}
                  onChange={(v) => updatePref({ timezone: v })}
                  options={timezoneOptions}
                  placeholder={placeholder}
                />
              );
            })()}
          </div>

          <div className="grid gap-2">
            <Label>WhatsApp</Label>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {whatsappStatusQuery.isLoading
                  ? "Checking status..."
                  : whatsappStatusQuery.data?.linked
                    ? "Linked"
                    : "Not linked"}
              </div>
              <Button
                variant="secondary"
                disabled={
                  whatsappStatusQuery.data?.linked
                    ? unlinkMutation.isPending
                    : startLinkMutation.isPending
                }
                onClick={() => {
                  if (whatsappStatusQuery.data?.linked) {
                    setUnlinkOpen(true);
                  } else {
                    startLinkMutation.mutate();
                  }
                }}
              >
                {whatsappStatusQuery.data?.linked
                  ? unlinkMutation.isPending
                    ? "Unlinking..."
                    : "Unlink WhatsApp"
                  : startLinkMutation.isPending
                    ? "Opening..."
                    : "Link WhatsApp"}
              </Button>
            </div>
          </div>

          <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unlink WhatsApp?</DialogTitle>
                <DialogDescription>
                  This will remove your WhatsApp link. You can link it again later.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setUnlinkOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={unlinkMutation.isPending}
                  onClick={() => unlinkMutation.mutate()}
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
  );
}
