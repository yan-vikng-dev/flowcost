import type * as React from "react"
import { cn } from "@/lib/utils"

function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
	return (
		<kbd
			className={cn(
				"inline-flex min-h-6 items-center justify-center rounded-md border border-border/60 bg-background/80 px-1.5 font-medium text-[0.65rem] text-muted-foreground shadow-xs",
				className,
			)}
			{...props}
		/>
	)
}

export { Kbd }
