import { createFileRoute } from "@tanstack/react-router";
import { EntriesForm } from "./-components/entriesForm";
import { MonthlyEntriesTable } from "./-components/entriesTable/index.js";
import { getUserPreferences } from "@/core/functions/preferences";
import { listEntriesThisMonthPaginated } from "@/core/functions/entries";

export const Route = createFileRoute("/_auth/app/")({
  loader: async ({ context }) => {
    const prefs = await context.queryClient.ensureQueryData({
      queryKey: ["userPreferences"],
      queryFn: () => getUserPreferences(),
    });

    const initialPageIndex = 0;
    const initialPageSize = 10;
    await context.queryClient.ensureQueryData({
      queryKey: [
        "entries",
        prefs.displayCurrency,
        initialPageIndex,
        initialPageSize,
      ],
      queryFn: () =>
        listEntriesThisMonthPaginated({
          data: { page: initialPageIndex, pageSize: initialPageSize },
        }),
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-4">
      <EntriesForm />
      <MonthlyEntriesTable />
    </div>
  );
}
