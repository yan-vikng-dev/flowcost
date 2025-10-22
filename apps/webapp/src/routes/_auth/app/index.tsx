import { createFileRoute } from "@tanstack/react-router";
import { EntriesForm } from "./-components/entriesForm";
import { MonthlyEntriesTable } from "./-components/entriesTable/index.js";
import { ExpensesByCategoryDonut } from "./-components/expensesByCategoryDonut";
import { IncomeByCategoryDonut } from "./-components/incomeByCategoryDonut";
import { getUserPreferences } from "@/core/functions/preferences";
import { listEntriesThisMonthPaginated } from "@/core/functions/entries";
import { getMonthlyEntriesForCharts } from "./-functions/monthlyEntries";

export const Route = createFileRoute("/_auth/app/")({
  loader: async ({ context }) => {
    const prefs = await context.queryClient.ensureQueryData({
      queryKey: ["userPreferences"],
      queryFn: () => getUserPreferences(),
    });

    const initialPageIndex = 0;
    const initialPageSize = 10;
    const initialSortBy = "executedAt" as const;
    const initialSortDir = "desc" as const;
    await context.queryClient.ensureQueryData({
      queryKey: [
        "entries",
        prefs.displayCurrency,
        initialPageIndex,
        initialPageSize,
        initialSortBy,
        initialSortDir,
      ],
      queryFn: () =>
        listEntriesThisMonthPaginated({
          data: {
            page: initialPageIndex,
            pageSize: initialPageSize,
            sortBy: initialSortBy,
            sortDir: initialSortDir,
          },
        }),
    });

    // Prefetch monthly entries for charts once
    await context.queryClient.ensureQueryData({
      queryKey: ["monthlyEntriesForCharts"],
      queryFn: () => getMonthlyEntriesForCharts(),
    });
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-4">
      <EntriesForm />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ExpensesByCategoryDonut />
        <IncomeByCategoryDonut />
      </div>
      <MonthlyEntriesTable />
    </div>
  );
}
