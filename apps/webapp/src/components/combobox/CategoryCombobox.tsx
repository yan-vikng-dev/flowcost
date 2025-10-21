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
      items={categories.map((cat) => ({
        value: cat,
        label: (
          <span className="flex items-center gap-2">
            {(() => {
              const Icon = getCategoryIcon(cat);
              return <Icon className="size-4" />;
            })()}
            <span>{cat}</span>
          </span>
        ),
      }))}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
