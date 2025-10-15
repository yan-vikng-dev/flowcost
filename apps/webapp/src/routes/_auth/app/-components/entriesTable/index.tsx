import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { listEntriesThisMonthPaginated, type MonthlyEntry } from "@/core/functions/entries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "./data-table"
import { monthlyEntriesColumns } from "./monthly-entries-columns"
import { getUserPreferences } from "@/core/functions/preferences"
import * as React from "react"
import type { PaginationState } from "@tanstack/react-table"

export function MonthlyEntriesTable() {
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 10 })

  const prefs = useQuery({ queryKey: ["userPreferences"], queryFn: () => getUserPreferences(), staleTime: 5 * 60 * 1000 })
  const displayCurrency = prefs.data?.displayCurrency ?? "USD"

  const { data, isLoading, isError } = useQuery<{ items: MonthlyEntry[]; total: number }>({
    queryKey: ["entries", displayCurrency, pagination.pageIndex, pagination.pageSize],
    queryFn: () => listEntriesThisMonthPaginated({ data: { page: pagination.pageIndex, pageSize: pagination.pageSize } }),
    placeholderData: keepPreviousData,
  })

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>This Month's Entries</CardTitle>
      </CardHeader>
      <CardContent>
        {isError ? (
          <div className="text-sm text-red-500">Failed to load entries.</div>
        ) : (
          <DataTable
            columns={monthlyEntriesColumns(displayCurrency)}
            data={isLoading || !data ? [] : data.items}
            manualPagination
            pageCount={data ? Math.max(1, Math.ceil(data.total / pagination.pageSize)) : 1}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        )}
      </CardContent>
    </Card>
  )
}
