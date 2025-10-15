import { LucideIcon } from "lucide-react";
import type { SVGProps, ForwardRefExoticComponent, RefAttributes } from "react";

export type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type CustomIconComponent = ForwardRefExoticComponent<
  Omit<IconProps, "ref"> & RefAttributes<SVGSVGElement>
>;

export type MergedIconComponent = LucideIcon | CustomIconComponent;