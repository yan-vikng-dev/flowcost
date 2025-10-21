import { ResponsiveCombobox } from "./ResponsiveCombobox";
import { type Category, categories } from "@repo/shared-config";
import { getCategoryIcon } from "@/config/categories";

export function CategoryCombobox({
  value,
  onChange,
  placeholder = "Select category",
  disabled,
  className,
}: {
  value: Category;
  onChange: (val: Category) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <ResponsiveCombobox
      value={value}
      onChange={onChange}
      className={className}
      items={categories.map((cat) => {
        const Icon = getCategoryIcon(cat);
        return {
          value: cat,
          ariaLabel: cat,
          label: (
            <span className="flex items-center gap-2">
              <span aria-hidden className="inline-flex w-5 sm:w-6 justify-center shrink-0 leading-none">
                <Icon className="size-4" />
              </span>
              <span>{cat}</span>
            </span>
          ),
          triggerLabel: (
            <span className="flex items-center gap-2">
              <span aria-hidden className="inline-flex w-5 sm:w-6 justify-center shrink-0 leading-none">
                <Icon className="size-4" />
              </span>
              <span className="hidden sm:inline">{cat}</span>
            </span>
          ),
        };
      })}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
