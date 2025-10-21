import { ResponsiveCombobox } from "./ResponsiveCombobox";
import { entryTypes, type EntryType } from "@repo/data-ops/drizzle/schemas/entries/table";
import { getEntryTypeIcon } from "@/config/entryTypes";

export function EntryTypeCombobox({
  value,
  onChange,
  placeholder = "Select type",
  disabled,
  className,
}: {
  value: EntryType;
  onChange: (val: EntryType) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ResponsiveCombobox
      value={value}
      onChange={onChange}
      className={className}
      items={entryTypes.map((t) => ({
        value: t,
        label: (
          <span className="flex items-center gap-2">
            {(() => {
              const Icon = getEntryTypeIcon(t);
              return <Icon className="size-4" />;
            })()}
            <span>{t}</span>
          </span>
        ),
      }))}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
