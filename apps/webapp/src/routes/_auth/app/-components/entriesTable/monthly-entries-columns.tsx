import { ColumnDef } from "@tanstack/react-table";
import type { MonthlyEntry } from "@/core/functions/entries";
import { Button } from "@/components/ui/button";
import { ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { getCategoryIcon } from "@/config/categories";
import { getEntryTypeIcon } from "@/config/entryTypes";

function formatCurrency(amount: number, currency: string, locale = "en-US") {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function monthlyEntriesColumns(displayCurrency: string): ColumnDef<MonthlyEntry>[] {
  return [
    {
      accessorKey: "executedAt",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Date
            {sorted === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : sorted === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const dt = row.original.executedAt;
        return new Date(dt).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        });
      },
      sortingFn: (a, b) => a.original.executedAt.getTime() - b.original.executedAt.getTime(),
    },
    {
      accessorKey: "entryType",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Type
            {sorted === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : sorted === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const entryType = String(row.getValue("entryType"));
        const Icon = getEntryTypeIcon(entryType as any);
        return (
          <span className="flex items-center gap-2">
            <Icon className="size-4" />
            <span>{entryType}</span>
          </span>
        );
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Category
            {sorted === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : sorted === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const category = String(row.getValue("category"));
        const Icon = getCategoryIcon(category);
        return (
          <span className="flex items-center gap-2">
            <Icon className="size-4" />
            <span>{category}</span>
          </span>
        );
      },
    },
    {
      accessorKey: "description",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Description
            {sorted === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : sorted === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => String(row.getValue("description") ?? ""),
    },
    {
      accessorKey: "amount",
      meta: { align: "right" },
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Original
            {sorted === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : sorted === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const amount = Number(row.getValue("amount"));
        const currency: string = row.original.currency;
        return <div className="text-right font-medium">{formatCurrency(amount, currency)}</div>;
      },
    },
    {
      accessorKey: "amountIls",
      meta: { align: "right" },
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        return (
          <Button
            variant="ghost"
            className="ml-auto"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Converted ({displayCurrency})
            {sorted === "asc" ? (
              <ArrowUpIcon className="ml-2 h-4 w-4" />
            ) : sorted === "desc" ? (
              <ArrowDownIcon className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDownIcon className="ml-2 h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        );
      },
      cell: ({ row }) => {
        const val = row.getValue("amountIls");
        return (
          <div className="text-right">
            {typeof val === "number" ? formatCurrency(val, displayCurrency) : "-"}
          </div>
        );
      },
    },
  ];
}
