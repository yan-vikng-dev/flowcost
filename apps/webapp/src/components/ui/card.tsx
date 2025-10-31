import type * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
				className,
			)}
			data-slot="card"
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [&:not(:has([data-slot=card-description]))]:grid-rows-1 [&:not(:has([data-slot=card-description]))]:items-center [&:not(:has([data-slot=card-description]))_[data-slot=card-action]:row-span-1 [&:not(:has([data-slot=card-description]))_[data-slot=card-action]:self-center [.border-b]:pb-6",
				className,
			)}
			data-slot="card-header"
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("font-semibold leading-none", className)}
			data-slot="card-title"
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("text-muted-foreground text-sm", className)}
			data-slot="card-description"
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"col-start-2 row-span-2 row-start-1 self-start justify-self-end [.has-[&:not(:has([data-slot=card-description]))]_&]:row-span-1 [.has-[&:not(:has([data-slot=card-description]))]_&]:self-center",
				className,
			)}
			data-slot="card-action"
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("px-6", className)}
			data-slot="card-content"
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
			data-slot="card-footer"
			{...props}
		/>
	)
}

export {
	Card,
	CardHeader,
	CardFooter,
	CardTitle,
	CardAction,
	CardDescription,
	CardContent,
}
