"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  VisibilityState,
  type PaginationState,
  type OnChangeFn,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ChevronDown, MoreHorizontal, Copy, Trash } from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { deleteEntries } from "@/core/functions/entries"
import { toast } from "sonner"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  manualPagination?: boolean
  pageCount?: number
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>
}

export function DataTable<TData, TValue>({
  columns,
  data,
  manualPagination = false,
  pageCount,
  pagination,
  onPaginationChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

  const queryClient = useQueryClient()
  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => deleteEntries({ data: { ids } }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["entries"] })
    },
  })

  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [confirmIds, setConfirmIds] = React.useState<string[]>([])

  // Selection column and actions column
  const selectionColumn = React.useMemo<ColumnDef<TData>>((): ColumnDef<TData> => ({
    id: "select",
    header: ({ table }) => {
      const isAllSelected = table.getIsAllPageRowsSelected()
      const isSomeSelected = table.getIsSomePageRowsSelected()
      return (
        <IndeterminateCheckbox
          checked={isAllSelected}
          indeterminate={!isAllSelected && isSomeSelected}
          aria-label="Select all"
          onChange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
        />
      )
    },
    cell: ({ row }) => (
      <IndeterminateCheckbox
        checked={row.getIsSelected()}
        aria-label="Select row"
        onChange={(e) => row.toggleSelected(e.currentTarget.checked)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  }), [])

  const actionsColumn = React.useMemo<ColumnDef<TData>>((): ColumnDef<TData> => ({
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const original = row.original as any
      const id: string | undefined = original?.id
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={async () => {
                if (!id) return
                await navigator.clipboard.writeText(id)
                toast.success("Copied entry ID")
              }}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={async () => {
                if (!id) return
                setConfirmIds([id])
                setConfirmOpen(true)
              }}
            >
              <Trash className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  }), [deleteMut])

  const enhancedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    return [selectionColumn, ...columns, actionsColumn]
  }, [columns, selectionColumn, actionsColumn])

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination,
    pageCount,
    onPaginationChange,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(pagination ? { pagination } : {}),
    },
  })

  return (
    <div>
      <div className="flex items-center gap-2 py-4">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={async () => {
                const ids = table
                  .getFilteredSelectedRowModel()
                  .rows.map((r) => (r.original as any)?.id)
                  .filter(Boolean) as string[]
                if (ids.length === 0) return
                setConfirmIds(ids)
                setConfirmOpen(true)
              }}
            >
              <Trash className="h-4 w-4" /> Delete selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const ids = table
                  .getFilteredSelectedRowModel()
                  .rows.map((r) => (r.original as any)?.id)
                  .filter(Boolean) as string[]
                if (ids.length === 0) return
                await navigator.clipboard.writeText(ids.join("\n"))
                toast.success(`Copied ${ids.length} id(s)`) 
              }}
            >
              <Copy className="h-4 w-4" /> Copy selected
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 20, 50, 100].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={table.getVisibleLeafColumns().length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmIds.length > 1 ? `Delete ${confirmIds.length} entries?` : "Delete entry?"}
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                try {
                  if (confirmIds.length === 0) return
                  await deleteMut.mutateAsync(confirmIds)
                  toast.success(
                    confirmIds.length > 1
                      ? `Deleted ${confirmIds.length} entries`
                      : "Deleted 1 entry"
                  )
                  setConfirmOpen(false)
                  setConfirmIds([])
                  table.resetRowSelection()
                } catch (e) {
                  toast.error("Failed to delete entries")
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Minimal indeterminate checkbox without Radix dependency
function IndeterminateCheckbox(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    indeterminate?: boolean
  }
) {
  const { indeterminate, className, ...rest } = props
  const ref = React.useRef<HTMLInputElement>(null)
  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate)
    }
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      className={"h-4 w-4 cursor-pointer " + (className ?? "")}
      {...rest}
    />
  )
}
