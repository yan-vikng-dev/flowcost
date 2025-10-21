import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { listEntriesThisMonthPaginated, type MonthlyEntry } from "@/core/functions/entries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "./data-table";
import { monthlyEntriesColumns } from "./monthly-entries-columns";
import { getUserPreferences } from "@/core/functions/preferences";
import * as React from "react";
import type { PaginationState, SortingState } from "@tanstack/react-table";

export function MonthlyEntriesTable() {
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "executedAt", desc: true },
  ]);

  const prefs = useQuery({
    queryKey: ["userPreferences"],
    queryFn: () => getUserPreferences(),
    staleTime: 5 * 60 * 1000,
  });
  const displayCurrency = prefs.data?.displayCurrency ?? "USD";

  const { data, isLoading, isError, isFetching } = useQuery<{ items: MonthlyEntry[]; total: number }>({
    queryKey: [
      "entries",
      displayCurrency,
      pagination.pageIndex,
      pagination.pageSize,
      sorting[0]?.id ?? "executedAt",
      sorting[0]?.desc ? "desc" : "asc",
    ],
    queryFn: () =>
      listEntriesThisMonthPaginated({
        data: {
          page: pagination.pageIndex,
          pageSize: pagination.pageSize,
          sortBy: (sorting[0]?.id as "executedAt" | "amount" | "category" | "entryType") ?? "executedAt",
          sortDir: sorting[0]?.desc ? "desc" : "asc",
        },
      }),
    placeholderData: keepPreviousData,
  });
  // isFetching comes from the same query above

  return (
    <Card>
      <CardHeader>
        <CardTitle>This Month&apos;s Entries</CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="text-sm text-red-500">Failed to load entries.</div>
        ) : (
          <DataTable
            columns={monthlyEntriesColumns(displayCurrency)}
            data={isLoading || !data ? [] : data.items}
            manualPagination
            manualSorting
            sorting={sorting}
            onSortingChange={setSorting}
            isLoading={isLoading}
            isFetching={isFetching}
            pageCount={data ? Math.max(1, Math.ceil(data.total / pagination.pageSize)) : 1}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        )}
      </CardContent>
    </Card>
  );
}
