import { type Category } from "@repo/shared-config";
import { type LucideIcon, ShoppingCartIcon, ForkKnifeIcon, CarIcon, BriefcaseMedicalIcon, MartiniIcon, ShieldIcon, ZapIcon, ShoppingBagIcon, DropletsIcon, HousePlugIcon, SparklesIcon, HomeIcon, HotelIcon, PlaneIcon, RepeatIcon, DumbbellIcon, GraduationCapIcon, PercentIcon, PawPrintIcon, BabyIcon, PiggyBankIcon, HandCoinsIcon, BriefcaseIcon, GiftIcon, SquirrelIcon } from "lucide-react";

export const category_icons: Record<Category, LucideIcon> = {
    "Food": ForkKnifeIcon,
    "Groceries": ShoppingCartIcon,
    "Transportation": CarIcon,
    "Shopping": ShoppingBagIcon,
    "Bills": ZapIcon,
    "Insurance": ShieldIcon,
    "Entertainment": MartiniIcon,
    "Health": BriefcaseMedicalIcon,
    "Personal Care": DropletsIcon,
    "Household": HousePlugIcon,
    "Beauty": SparklesIcon,
    "Rent": HomeIcon,
    "Accommodation": HotelIcon,
    "Flights": PlaneIcon,
    "Subscriptions": RepeatIcon,
    "Fitness": DumbbellIcon,
    "Education": GraduationCapIcon,
    "Taxes": PercentIcon,
    "Pets": PawPrintIcon,
    "Children": BabyIcon,
    "Investment": PiggyBankIcon,
    "Salary": HandCoinsIcon,
    "Business": BriefcaseIcon,
    "Gift": GiftIcon,
    "Other": SquirrelIcon,
} as const;

export const getCategoryIcon = (category: string) => {
    return category_icons[category as Category] ?? SquirrelIcon;
}