import { ResponsiveCombobox } from "./ResponsiveCombobox";
import { type Currency, currencies, getCurrencyName, getCurrencySymbol } from "@repo/shared-config";

export function CurrencyCombobox({
  value,
  onChange,
  placeholder = "Select currency",
  disabled,
  className,
}: {
  value: Currency;
  onChange: (val: Currency) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ResponsiveCombobox
      value={value}
      onChange={onChange}
      className={className}
      items={currencies.map((c) => ({
        value: c,
        label: (
          <span className="flex items-center gap-2">
            <span className="tabular-nums text-muted-foreground">{getCurrencySymbol(c)}</span>
            <span>{c}</span>
          </span>
        ),
        keywords: [getCurrencyName(c)],
      }))}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
