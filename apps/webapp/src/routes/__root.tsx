/// <reference types="vite/client" />

import type { QueryClient } from "@tanstack/react-query"
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router"
// import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import type * as React from "react"
import { DefaultCatchBoundary } from "@/components/default-catch-boundary"
import { NotFound } from "@/components/not-found"
import { ThemeProvider } from "@/components/theme"
import { Toaster } from "@/components/ui/sonner"
import { PosthogAnalytics } from "@/integrations/posthog/analytics"
import appCss from "@/styles.css?url"
import { seo } from "@/utils/seo"

export const Route = createRootRouteWithContext<{
	queryClient: QueryClient
}>()({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
			},
			...seo({
				title: "Flowcost | WhatsApp Expense Tracker",
				description:
					"Track expenses by texting WhatsApp. Automatic weekly and monthly reports. Pair with a partner to share spending.",
			}),
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com",
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous",
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap",
			},
			{ rel: "stylesheet", href: appCss },
			{
				rel: "apple-touch-icon",
				href: "/logo/logo-bg-128.webp",
			},
			{ rel: "manifest", href: "/site.webmanifest", color: "#fffff" },
			{ rel: "icon", href: "/favicon.ico" },
		],
	}),
	errorComponent: (props) => {
		return (
			<RootDocument>
				<DefaultCatchBoundary {...props} />
			</RootDocument>
		)
	},
	notFoundComponent: () => <NotFound />,
	component: RootComponent,
})

function RootComponent() {
	return (
		<RootDocument>
			<ThemeProvider>
				<Outlet />
				<PosthogAnalytics />
			</ThemeProvider>
		</RootDocument>
	)
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
				<script
					async
					src="https://www.googletagmanager.com/gtag/js?id=AW-17572813812"
				/>
				<script
					dangerouslySetInnerHTML={{
						__html: [
							"window.dataLayer = window.dataLayer || [];",
							"function gtag(){dataLayer.push(arguments);}",
							"gtag('js', new Date());",
							"gtag('config', 'AW-17572813812');",
						].join(""),
					}}
				/>
			</head>
			<body>
				{children}
				<Toaster />
				{/* <TanStackRouterDevtools position="bottom-right" /> */}
				{/* <ReactQueryDevtools buttonPosition="bottom-left" /> */}
				<Scripts />
			</body>
		</html>
	)
}
