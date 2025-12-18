import { Link, useRouterState } from "@tanstack/react-router"
import * as React from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { useIsDesktop } from "@/hooks/use-is-desktop"
import { useOnboardingTour } from "./provider"
import { getStepTarget, onboardingSteps } from "./steps"

type AnchorPosition = {
	top: number
	left: number
	width: number
	height: number
}

type DetailAnchor = AnchorPosition & {
	id: string
	copy: string
}

const CALLOUT_WIDTH = 320

function clampPosition(left: number, viewportWidth: number) {
	const padding = 12
	return Math.min(
		Math.max(left, padding),
		viewportWidth - CALLOUT_WIDTH - padding,
	)
}

export function OnboardingCallouts() {
	const { status, isChecklistOpen, selectedStepId, setChecklistOpen } =
		useOnboardingTour()
	const isDesktop = useIsDesktop()
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})
	const [portalEl, setPortalEl] = React.useState<HTMLElement | null>(null)

	React.useEffect(() => {
		if (typeof document === "undefined") return
		let node = document.getElementById("onboarding-callouts")
		if (!node) {
			node = document.createElement("div")
			node.id = "onboarding-callouts"
			document.body.appendChild(node)
		}
		setPortalEl(node)
	}, [])

	const step = onboardingSteps.find(
		(candidate) => candidate.id === selectedStepId,
	)
	const targetId = step ? getStepTarget(step, isDesktop) : undefined

	const [anchor, setAnchor] = React.useState<AnchorPosition | null>(null)
	const [detailAnchors, setDetailAnchors] = React.useState<DetailAnchor[]>([])
	const [missingTarget, setMissingTarget] = React.useState(false)
	const previousOutline = React.useRef<string | null>(null)
	const highlighted = React.useRef<HTMLElement | null>(null)

	const isOnRoute = step ? pathname.startsWith(step.route) : false
	const shouldRender = Boolean(
		typeof document !== "undefined" &&
			status?.isMissingSetup &&
			isChecklistOpen &&
			step &&
			targetId,
	)

	React.useEffect(() => {
		if (!shouldRender || !step || !targetId) {
			if (highlighted.current) {
				highlighted.current.style.outline = previousOutline.current ?? ""
				highlighted.current.style.outlineOffset = ""
			}
			highlighted.current = null
			setAnchor(null)
			setDetailAnchors([])
			setMissingTarget(false)
			return
		}

		const selector = `[data-onboarding="${targetId}"]`
		let resizeObserver: ResizeObserver | null = null
		let isAttached = false

		const cleanupHighlight = () => {
			if (highlighted.current) {
				highlighted.current.style.outline = previousOutline.current ?? ""
				highlighted.current.style.outlineOffset = ""
			}
			highlighted.current = null
		}

		const updatePositions = (node: HTMLElement) => {
			const rect = node.getBoundingClientRect()
			setAnchor({
				top: rect.top + window.scrollY,
				left: rect.left + window.scrollX,
				width: rect.width,
				height: rect.height,
			})

			const detailPositions: DetailAnchor[] = (step.detailSteps ?? [])
				.map((detail) => {
					const detailNode = document.querySelector<HTMLElement>(
						`[data-onboarding="${detail.target}"]`,
					)
					if (!detailNode) return null
					const detailRect = detailNode.getBoundingClientRect()
					return {
						id: detail.target,
						copy: detail.copy,
						top: detailRect.top + window.scrollY,
						left: detailRect.left + window.scrollX,
						width: detailRect.width,
						height: detailRect.height,
					}
				})
				.filter((detail): detail is DetailAnchor => Boolean(detail))

			setDetailAnchors(detailPositions)
		}

		const attachToTarget = (node: HTMLElement) => {
			isAttached = true
			setMissingTarget(false)
			node.scrollIntoView({ behavior: "smooth", block: "center" })

			cleanupHighlight()
			previousOutline.current = node.style.outline
			highlighted.current = node
			node.style.outline = "2px solid rgba(59, 130, 246, 0.8)"
			node.style.outlineOffset = "2px"

			updatePositions(node)

			resizeObserver = new ResizeObserver(() => updatePositions(node))
			resizeObserver.observe(node)

			const handleScroll = () => updatePositions(node)
			const handleResize = () => updatePositions(node)
			window.addEventListener("scroll", handleScroll, true)
			window.addEventListener("resize", handleResize)

			return () => {
				resizeObserver?.disconnect()
				window.removeEventListener("scroll", handleScroll, true)
				window.removeEventListener("resize", handleResize)
			}
		}

		const tryAttach = () => {
			const target = document.querySelector<HTMLElement>(selector)
			if (target) {
				return attachToTarget(target)
			}
			setAnchor(null)
			setDetailAnchors([])
			setMissingTarget(true)
			return null
		}

		const cleanupListeners = tryAttach()
		const retryInterval = window.setInterval(() => {
			if (isAttached) {
				window.clearInterval(retryInterval)
				return
			}
			const result = tryAttach()
			if (result) {
				window.clearInterval(retryInterval)
			}
		}, 700)

		return () => {
			window.clearInterval(retryInterval)
			cleanupListeners?.()
			cleanupHighlight()
		}
	}, [shouldRender, step, targetId])

	if (!shouldRender || !step || !targetId) return null

	const left = anchor
		? clampPosition(
				anchor.left + anchor.width / 2 - CALLOUT_WIDTH / 2,
				window.innerWidth,
			)
		: clampPosition(window.innerWidth - CALLOUT_WIDTH - 16, window.innerWidth)
	const top = anchor ? anchor.top + anchor.height + 12 : 96
	const showNavigationHint = !isOnRoute

	if (!portalEl) return null

	return createPortal(
		<div className="pointer-events-none fixed inset-0 z-50">
			<div
				className="pointer-events-auto absolute w-[320px] space-y-2 rounded-lg border bg-background/95 p-4 shadow-2xl backdrop-blur"
				style={{ left, top }}
			>
				<div className="font-semibold text-muted-foreground text-xs uppercase">
					Bob says
				</div>
				<div className="space-y-2">
					<p className="text-sm leading-relaxed">{step.copy}</p>
					{missingTarget && (
						<p className="text-muted-foreground text-xs">
							Bob can&apos;t spot the button here—open the dialog or switch to
							the right page, then try again.
						</p>
					)}
					{showNavigationHint && (
						<div className="flex items-center gap-2">
							<Button asChild size="sm" variant="secondary">
								<Link to={step.route}>
									Go to {step.route === "/app" ? "Dashboard" : "Settings"}
								</Link>
							</Button>
							<Button
								onClick={() => setChecklistOpen(false)}
								size="sm"
								variant="ghost"
							>
								Close tour
							</Button>
						</div>
					)}
				</div>
			</div>

			{detailAnchors.map((detail) => {
				const detailLeft = clampPosition(
					detail.left + detail.width / 2 - 140,
					window.innerWidth,
				)
				const detailTop = detail.top + detail.height + 8
				return (
					<div
						className="pointer-events-auto absolute w-[280px] rounded-md border bg-background/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
						key={detail.id}
						style={{ left: detailLeft, top: detailTop }}
					>
						{detail.copy}
					</div>
				)
			})}
		</div>,
		document.body,
	)
}
