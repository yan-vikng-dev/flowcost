import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronsUpDownIcon, CheckIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

export type ComboItem<T extends string> = {
  value: T;
  label: React.ReactNode;
  keywords?: string[];
  ariaLabel?: string;
  triggerLabel?: React.ReactNode;
};

export function ResponsiveCombobox<T extends string>({
  value,
  onChange,
  items,
  placeholder,
  disabled,
  className,
  contentWidthClass = "w-[220px]",
}: {
  value: T;
  onChange: (val: T) => void;
  items: Array<ComboItem<T>>;
  placeholder: string;
  disabled?: boolean;
  className?: string;
  contentWidthClass?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const current = items.find((i) => i.value === value);

  const triggerClass = cn(
    // Match SelectTrigger tokens and behavior
    "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50",
    "flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 h-9 font-normal",
    className,
  );

  const list = (
    <Command>
      <CommandInput placeholder="Search..." className="h-9" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {items.map((item) => (
            <CommandItem
              key={item.value}
              value={item.value}
              keywords={item.keywords}
              onSelect={(val) => {
                onChange(val as T);
                setOpen(false);
              }}
            >
              {item.label}
              <CheckIcon
                className={cn("ml-auto size-4", value === item.value ? "opacity-100" : "opacity-0")}
              />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            aria-label={current ? current.ariaLabel ?? String(current.value) : placeholder}
            className={triggerClass}
            data-placeholder={current ? undefined : true}
          >
            {current ? current.triggerLabel ?? current.label : <>{placeholder}</>}
            <ChevronsUpDownIcon className="size-4 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className={cn(contentWidthClass, "p-0")} align="start">
          {list}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          aria-label={current ? current.ariaLabel ?? String(current.value) : placeholder}
          className={triggerClass}
          data-placeholder={current ? undefined : true}
        >
          {current ? current.triggerLabel ?? current.label : <>{placeholder}</>}
          <ChevronsUpDownIcon className="size-4 opacity-50" />
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <div className="mt-2 border-t">{list}</div>
      </DrawerContent>
    </Drawer>
  );
}
