import type { Category } from "@repo/shared-config"
import { Badge } from "@/components/ui/badge"
import { getCategoryIcon } from "@/config/categories"

export function CategoryChips({ categories }: { categories: Category[] }) {
	const firstThree = categories.slice(0, 3)
	return (
		<div className="flex flex-wrap gap-1">
			{firstThree.map((category) => {
				const Icon = getCategoryIcon(category)
				return (
					<Badge key={category} variant="secondary">
						<span className="mr-1 inline-flex w-4 justify-center">
							<Icon className="size-3.5" />
						</span>
						{category}
					</Badge>
				)
			})}
			{categories.length > 3 && (
				<Badge variant="outline">+{categories.length - 3}</Badge>
			)}
		</div>
	)
}
