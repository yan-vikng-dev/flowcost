import * as React from "react";
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
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, MoreHorizontal, Copy, Trash, ChevronLeft, ChevronRight } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteEntries } from "@/core/functions/entries";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type RowWithId = { id?: string };
type ColumnMeta = { align?: "left" | "right" | "center" };

interface DataTableProps<TData extends RowWithId, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  manualPagination?: boolean;
  pageCount?: number;
  pagination?: PaginationState;
  onPaginationChange?: OnChangeFn<PaginationState>;
  manualSorting?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  isLoading?: boolean; // initial load
  isFetching?: boolean; // background refetch
}

export function DataTable<TData extends RowWithId, TValue>({
  columns,
  data,
  manualPagination = false,
  pageCount,
  pagination,
  onPaginationChange,
  manualSorting = false,
  sorting: controlledSorting,
  onSortingChange,
  isLoading = false,
  isFetching = false,
}: DataTableProps<TData, TValue>) {
  const [uncontrolledSorting, setUncontrolledSorting] = React.useState<SortingState>([]);
  const sorting = controlledSorting ?? uncontrolledSorting;
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const queryClient = useQueryClient();
  const deleteMut = useMutation({
    mutationFn: (ids: string[]) => deleteEntries({ data: { ids } }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["entries"] }),
        queryClient.invalidateQueries({ queryKey: ["monthlyEntriesForCharts"] }),
      ]);
    },
  });

  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmIds, setConfirmIds] = React.useState<string[]>([]);

  // Selection column and actions column
  const selectionColumn = React.useMemo<ColumnDef<TData>>(
    (): ColumnDef<TData> => ({
      id: "select",
      header: ({ table }) => {
        const isAllSelected = table.getIsAllPageRowsSelected();
        const isSomeSelected = table.getIsSomePageRowsSelected();
        return (
          <IndeterminateCheckbox
            checked={isAllSelected}
            indeterminate={!isAllSelected && isSomeSelected}
            aria-label="Select all"
            onChange={(e) => table.toggleAllPageRowsSelected(e.currentTarget.checked)}
          />
        );
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
    }),
    [],
  );

  const actionsColumn = React.useMemo<ColumnDef<TData>>(
    (): ColumnDef<TData> => ({
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const id: string | undefined = row.original.id;
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
                onClick={() => {
                  if (!id) return;
                  void navigator.clipboard.writeText(id).then(() => {
                    toast.success("Copied entry ID");
                  });
                }}
              >
                <Copy className="mr-2 h-4 w-4" /> Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (!id) return;
                  setConfirmIds([id]);
                  setConfirmOpen(true);
                }}
              >
                <Trash className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
    [],
  );

  const enhancedColumns = React.useMemo<ColumnDef<TData, TValue>[]>(() => {
    return [selectionColumn, ...columns, actionsColumn];
  }, [columns, selectionColumn, actionsColumn]);

  const table = useReactTable({
    data,
    columns: enhancedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: onSortingChange ?? setUncontrolledSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination,
    manualSorting,
    pageCount,
    onPaginationChange,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(pagination ? { pagination } : {}),
    },
  });

  // Helper to compute pagination items with ellipses
  const paginationItems = React.useMemo(() => {
    const total = table.getPageCount();
    const current = table.getState().pagination.pageIndex + 1; // 1-based for UI
    const siblingCount = 1;
    const boundaryCount = 1;
    if (total <= 0) return [] as Array<number | "dots">;

    const range = (start: number, end: number) => {
      const out: number[] = [];
      for (let i = start; i <= end; i++) out.push(i);
      return out;
    };

    const startPages = range(1, Math.min(boundaryCount, total));
    const endStart = Math.max(total - boundaryCount + 1, boundaryCount + 1);
    const endPages = range(endStart, total);

    const siblingsStart = Math.max(
      Math.min(current - siblingCount, total - boundaryCount - siblingCount * 2 - 1),
      boundaryCount + 2,
    );
    const siblingsEnd = Math.min(
      Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
      Math.min(endStart - 2, total - 1),
    );

    const items: Array<number | "dots"> = [];
    items.push(...startPages);
    if (siblingsStart > boundaryCount + 2) {
      items.push("dots");
    } else if (boundaryCount + 1 < total - boundaryCount) {
      items.push(boundaryCount + 1);
    }

    items.push(...range(siblingsStart, siblingsEnd));

    if (siblingsEnd < total - boundaryCount - 1) {
      items.push("dots");
    } else if (total - boundaryCount > boundaryCount) {
      items.push(total - boundaryCount);
    }

    items.push(...endPages);
    // De-duplicate in case of overlaps
    return items.filter((v, i, arr) => i === 0 || v !== arr[i - 1]);
  }, [table]);

  return (
    <div>
      {/* Top loading bar for background fetches */}
      {isFetching && !isLoading ? (
        <div className="fixed left-0 right-0 top-0 z-30">
          <div className="h-0.5 w-full overflow-hidden bg-muted">
            <div className="h-0.5 w-1/3 animate-pulse bg-primary" />
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-2 py-4">
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const ids = table
                  .getFilteredSelectedRowModel()
                  .rows.map((r) => (r.original as RowWithId).id)
                  .filter(Boolean) as string[];
                if (ids.length === 0) return;
                setConfirmIds(ids);
                setConfirmOpen(true);
              }}
            >
              <Trash className="h-4 w-4" /> Delete selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const ids = table
                  .getFilteredSelectedRowModel()
                  .rows.map((r) => (r.original as RowWithId).id)
                  .filter(Boolean) as string[];
                if (ids.length === 0) return;
                void navigator.clipboard.writeText(ids.join("\n")).then(() => {
                  toast.success(`Copied ${ids.length} id(s)`);
                });
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
      </div>

      <div className="w-full overflow-x-auto rounded-md border overscroll-x-contain">
        {isLoading ? (
          <Table>
            <TableHeader>
              <TableRow>
                {enhancedColumns.map((col, idx) => (
                  <TableHead key={String((col as { id?: string }).id ?? idx)}>
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, r) => (
                <TableRow key={`sk-${r}`}>
                  {enhancedColumns.map((_, c) => (
                    <TableCell key={`sk-${r}-${c}`}>
                      <div className="h-4 w-full max-w-[200px] animate-pulse rounded bg-muted" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const align = (header.column.columnDef as { meta?: ColumnMeta }).meta?.align;
                    const thClass =
                      align === "right"
                        ? "text-right"
                        : align === "center"
                          ? "text-center"
                          : "text-left";
                    return (
                      <TableHead key={header.id} className={thClass}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          (cell.column.columnDef as { meta?: ColumnMeta }).meta?.align === "right"
                            ? "text-right"
                            : (cell.column.columnDef as { meta?: ColumnMeta }).meta?.align ===
                                "center"
                              ? "text-center"
                              : undefined,
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getVisibleLeafColumns().length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 py-4">
        {/* Pagination controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft />
          </Button>
          {paginationItems.map((item, idx) => {
            if (item === "dots") {
              return (
                <Button
                  key={`dots-${idx}`}
                  variant="ghost"
                  size="sm"
                  disabled
                  className="px-2"
                  aria-hidden
                >
                  …
                </Button>
              );
            }
            const page = item;
            const isActive = table.getState().pagination.pageIndex === page - 1;
            return (
              <Button
                key={page}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => table.setPageIndex(page - 1)}
                aria-current={isActive ? "page" : undefined}
              >
                {page}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight />
          </Button>
        </div>

        {/* Rows per page selector */}
        <div className="ml-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => {
              table.setPageSize(Number(v));
              table.setPageIndex(0);
            }}
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

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmIds.length > 1 ? `Delete ${confirmIds.length} entries?` : "Delete entry?"}
            </DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                void (async () => {
                  try {
                    if (confirmIds.length === 0) return;
                    await deleteMut.mutateAsync(confirmIds);
                    toast.success(
                      confirmIds.length > 1
                        ? `Deleted ${confirmIds.length} entries`
                        : "Deleted 1 entry",
                    );
                    setConfirmOpen(false);
                    setConfirmIds([]);
                    table.resetRowSelection();
                  } catch {
                    toast.error("Failed to delete entries");
                  }
                })();
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Minimal indeterminate checkbox without Radix dependency
function IndeterminateCheckbox(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    indeterminate?: boolean;
  },
) {
  const { indeterminate, className, ...rest } = props;
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = Boolean(indeterminate);
    }
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={"h-4 w-4 cursor-pointer " + (className ?? "")}
      {...rest}
    />
  );
}
