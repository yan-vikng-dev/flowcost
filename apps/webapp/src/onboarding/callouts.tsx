import { useRouterState } from "@tanstack/react-router"
import * as React from "react"
import { createPortal } from "react-dom"
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
	dialog?: AnchorPosition
	kind?: "navigation" | "trigger" | "detail"
}

type DetailCalloutSize = {
	width: number
	height: number
}

const CALLOUT_WIDTH = 320
const DETAIL_CALLOUT_WIDTH = 240
const DETAIL_CALLOUT_ESTIMATED_HEIGHT = 18
const HIGHLIGHT_OUTLINE_WIDTH_PX = 2
const HIGHLIGHT_OUTLINE_OFFSET_PX = 2
const HIGHLIGHT_OUTLINE_TOTAL_PX =
	HIGHLIGHT_OUTLINE_WIDTH_PX + HIGHLIGHT_OUTLINE_OFFSET_PX
const ARROW_SIZE = 256
const ARROW_VIEWBOX_WIDTH = 415.262
const ARROW_VIEWBOX_HEIGHT = 415.261
const ARROW_TAIL_VIEWBOX = { x: 0, y: 17.576 }
const ARROW_TIP_VIEWBOX = { x: 414.937, y: 374.984 }
const ARROW_TAIL_PX = {
	x: (ARROW_TAIL_VIEWBOX.x * ARROW_SIZE) / ARROW_VIEWBOX_WIDTH,
	y: (ARROW_TAIL_VIEWBOX.y * ARROW_SIZE) / ARROW_VIEWBOX_HEIGHT,
}
const ARROW_TIP_PX = {
	x: (ARROW_TIP_VIEWBOX.x * ARROW_SIZE) / ARROW_VIEWBOX_WIDTH,
	y: (ARROW_TIP_VIEWBOX.y * ARROW_SIZE) / ARROW_VIEWBOX_HEIGHT,
}
const ARROW_BASE_DX_PX = ARROW_TIP_PX.x - ARROW_TAIL_PX.x
const ARROW_BASE_DY_PX = ARROW_TIP_PX.y - ARROW_TAIL_PX.y
const ARROW_BASE_ANGLE_RADIANS = Math.atan2(ARROW_BASE_DY_PX, ARROW_BASE_DX_PX)
const ARROW_BASE_LENGTH_PX = Math.hypot(ARROW_BASE_DX_PX, ARROW_BASE_DY_PX)

function clampPosition(left: number, viewportWidth: number) {
	const padding = 12
	return Math.min(
		Math.max(left, padding),
		viewportWidth - CALLOUT_WIDTH - padding,
	)
}

function clampWithin(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max)
}

function isOnStepRoute(stepRoute: "/app" | "/app/settings", pathname: string) {
	if (stepRoute === "/app") {
		return pathname === "/app" || pathname === "/app/"
	}
	return pathname === stepRoute || pathname.startsWith(`${stepRoute}/`)
}

function pointOnTargetHorizontalEdgeAtVerticalCenter(
	fromX: number,
	rect: AnchorPosition,
) {
	const centerX = rect.left + rect.width / 2
	const centerY = rect.top + rect.height / 2
	const edgeX = fromX < centerX ? rect.left : rect.left + rect.width

	return { x: edgeX, y: centerY }
}

function DetailCallout({
	copy,
	left,
	top,
	onSize,
}: {
	copy: string
	left: number
	top: number
	onSize: (size: DetailCalloutSize) => void
}) {
	const ref = React.useRef<HTMLDivElement>(null)
	const onSizeRef = React.useRef(onSize)
	onSizeRef.current = onSize

	React.useLayoutEffect(() => {
		const node = ref.current
		if (!node) return

		const update = () => {
			const rect = node.getBoundingClientRect()
			onSizeRef.current({
				width: Math.ceil(rect.width),
				height: Math.ceil(rect.height),
			})
		}

		update()
		const observer = new ResizeObserver(() => update())
		observer.observe(node)
		return () => observer.disconnect()
	}, [])

	return (
		<div
			className="-rotate-1 absolute max-w-[240px] font-medium text-foreground/80 text-xs leading-tight drop-shadow-sm"
			ref={ref}
			style={{ left, top }}
		>
			{copy}
		</div>
	)
}

const navigationTargetByRoute = {
	"/app": "nav-dashboard",
	"/app/settings": "nav-settings",
} as const satisfies Record<"/app" | "/app/settings", string>

export function OnboardingCallouts() {
	const { status, isChecklistOpen, selectedStepId } = useOnboardingTour()
	const isDesktop = useIsDesktop()
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})
	const [portalEl, setPortalEl] = React.useState<HTMLElement | null>(null)

	React.useEffect(() => {
		if (typeof document === "undefined") return
		let node = document.getElementById("onboarding-callouts")
		let created = false
		if (!node) {
			node = document.createElement("div")
			node.id = "onboarding-callouts"
			document.body.appendChild(node)
			created = true
		}
		setPortalEl(node)

		return () => {
			if (created && node?.parentNode) {
				node.parentNode.removeChild(node)
			}
		}
	}, [])

	const step = onboardingSteps.find(
		(candidate) => candidate.id === selectedStepId,
	)
	const isOnRoute = step ? isOnStepRoute(step.route, pathname) : false
	const navigationTargetId = step
		? navigationTargetByRoute[step.route]
		: undefined
	const targetId = step
		? isOnRoute
			? getStepTarget(step, isDesktop)
			: navigationTargetId
		: undefined

	const [anchor, setAnchor] = React.useState<AnchorPosition | null>(null)
	const [detailAnchors, setDetailAnchors] = React.useState<DetailAnchor[]>([])
	const [detailCalloutSizes, setDetailCalloutSizes] = React.useState<
		Record<string, DetailCalloutSize | undefined>
	>({})
	const previousOutline = React.useRef<string | null>(null)
	const highlighted = React.useRef<HTMLElement | null>(null)

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
			return
		}

		const selector = `[data-onboarding="${targetId}"]`
		let resizeObserver: ResizeObserver | null = null
		let mutationObserver: MutationObserver | null = null
		let rafId: number | null = null
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
				top: rect.top,
				left: rect.left,
				width: rect.width,
				height: rect.height,
			})

			const detailPositions: DetailAnchor[] = isOnRoute
				? (step.detailSteps ?? [])
						.map((detail) => {
							const detailNode = document.querySelector<HTMLElement>(
								`[data-onboarding="${detail.target}"]`,
							)
							if (!detailNode) return null
							const detailRect = detailNode.getBoundingClientRect()
							const dialogNode =
								detailNode.closest<HTMLElement>('[role="dialog"]')
							const dialogRect = dialogNode?.getBoundingClientRect()
							const base: DetailAnchor = {
								id: detail.target,
								copy: detail.copy,
								kind: "detail",
								top: detailRect.top,
								left: detailRect.left,
								width: detailRect.width,
								height: detailRect.height,
							}

							if (!dialogRect) return base

							return {
								...base,
								dialog: {
									top: dialogRect.top,
									left: dialogRect.left,
									width: dialogRect.width,
									height: dialogRect.height,
								},
							}
						})
						.filter((detail): detail is DetailAnchor => detail !== null)
				: [
						{
							id: `nav:${step.route}`,
							copy: `Head to ${step.route === "/app" ? "Dashboard" : "Settings"} and I’ll point at the right spot.`,
							kind: "navigation",
							top: rect.top,
							left: rect.left,
							width: rect.width,
							height: rect.height,
						},
					]

			const positions =
				isOnRoute && detailPositions.length === 0
					? [
							{
								id: `trigger:${step.id}`,
								copy: step.triggerCopy,
								kind: "trigger",
								top: rect.top,
								left: rect.left,
								width: rect.width,
								height: rect.height,
							} satisfies DetailAnchor,
						]
					: detailPositions

			setDetailAnchors(positions)
		}

		const attachToTarget = (node: HTMLElement) => {
			isAttached = true
			if (!targetId.startsWith("nav-")) {
				node.scrollIntoView({ behavior: "smooth", block: "center" })
			}

			cleanupHighlight()
			previousOutline.current = node.style.outline
			highlighted.current = node
			node.style.outline = "2px solid rgba(59, 130, 246, 0.8)"
			node.style.outlineOffset = "2px"

			updatePositions(node)

			const scheduleUpdate = () => {
				if (rafId !== null) return
				rafId = window.requestAnimationFrame(() => {
					rafId = null
					updatePositions(node)
				})
			}

			resizeObserver = new ResizeObserver(() => updatePositions(node))
			resizeObserver.observe(node)

			const handleScroll = () => updatePositions(node)
			const handleResize = () => updatePositions(node)
			window.addEventListener("scroll", handleScroll, true)
			window.addEventListener("resize", handleResize)

			mutationObserver = new MutationObserver(() => scheduleUpdate())
			mutationObserver.observe(document.body, {
				childList: true,
				subtree: true,
			})

			return () => {
				if (rafId !== null) {
					window.cancelAnimationFrame(rafId)
				}
				resizeObserver?.disconnect()
				mutationObserver?.disconnect()
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
	}, [isOnRoute, shouldRender, step, targetId])

	if (!shouldRender || !step || !targetId) return null

	const left = anchor
		? clampPosition(
				anchor.left + anchor.width / 2 - CALLOUT_WIDTH / 2,
				window.innerWidth,
			)
		: clampPosition(window.innerWidth - CALLOUT_WIDTH - 16, window.innerWidth)
	const top = anchor ? anchor.top + anchor.height + 12 : 96
	const hasDetailPointers = detailAnchors.some(
		(detail) => detail.kind === "detail",
	)

	if (!portalEl) return null

	const hasDialogDetails = detailAnchors.some((detail) =>
		Boolean(detail.dialog),
	)
	const showActionBox = isOnRoute && hasDetailPointers && "detailsCopy" in step

	return createPortal(
		<div className="pointer-events-none fixed inset-0 z-100">
			{showActionBox && (
				<div
					className="pointer-events-auto absolute w-[320px] space-y-2 rounded-lg border bg-background/95 p-4 shadow-2xl backdrop-blur"
					style={{
						left: hasDialogDetails
							? clampPosition(
									window.innerWidth - CALLOUT_WIDTH - 16,
									window.innerWidth,
								)
							: left,
						top: hasDialogDetails ? 16 : top,
					}}
				>
					<div className="font-semibold text-muted-foreground text-xs uppercase">
						Bob says
					</div>
					<div className="space-y-2">
						<p className="text-sm leading-relaxed">{step.detailsCopy}</p>
					</div>
				</div>
			)}

			{detailAnchors.map((detail) => {
				const target: AnchorPosition = {
					left: detail.left,
					top: detail.top,
					width: detail.width,
					height: detail.height,
				}
				const tx = target.left + target.width / 2
				const ty = target.top + target.height / 2

				const prefersLeft = tx < window.innerWidth / 2

				const measured = detailCalloutSizes[detail.id]
				const hintWidth = measured?.width ?? DETAIL_CALLOUT_WIDTH
				const hintHeight = measured?.height ?? DETAIL_CALLOUT_ESTIMATED_HEIGHT

				let hintLeft = tx - hintWidth / 2
				let hintTop = target.top + target.height + 8
				let placement: "right" | "left" | "top" | "bottom" = "bottom"
				let start: { x: number; y: number } | null = null
				let end: { x: number; y: number } | null = null

				if (detail.kind === "navigation") {
					const edgePadding = 12
					const navGap = 64
					const arrowGap = 8
					const targetTop = target.top
					const targetBottom = target.top + target.height
					const targetCenterX = target.left + target.width / 2

					const spaceBelow =
						window.innerHeight - targetBottom - navGap - hintHeight
					const spaceAbove = targetTop - navGap - hintHeight
					const canBelow = spaceBelow >= 0
					const canAbove = spaceAbove >= 0
					const placeBelow =
						(canBelow && targetTop < window.innerHeight / 2) || !canAbove

					placement = placeBelow ? "bottom" : "top"
					hintLeft = clampWithin(
						targetCenterX - hintWidth / 2,
						edgePadding,
						window.innerWidth - hintWidth - edgePadding,
					)
					hintTop = placeBelow
						? targetBottom + navGap
						: targetTop - navGap - hintHeight

					start = placeBelow
						? { x: hintLeft + hintWidth / 2, y: hintTop - arrowGap }
						: {
								x: hintLeft + hintWidth / 2,
								y: hintTop + hintHeight + arrowGap,
							}
					end = placeBelow
						? {
								x: targetCenterX,
								y: targetBottom + HIGHLIGHT_OUTLINE_TOTAL_PX,
							}
						: { x: targetCenterX, y: targetTop - HIGHLIGHT_OUTLINE_TOTAL_PX }
				} else if (detail.kind === "trigger") {
					const edgePadding = 12
					const gap = 16

					const targetRight = target.left + target.width
					const targetCenterY = target.top + target.height / 2

					placement = "right"
					hintLeft = targetRight + gap
					hintTop = targetCenterY - hintHeight / 2

					if (hintLeft < edgePadding) hintLeft = edgePadding
					hintTop = clampWithin(
						hintTop,
						12,
						window.innerHeight - hintHeight - 12,
					)

					end = {
						x: targetRight + HIGHLIGHT_OUTLINE_TOTAL_PX,
						y: targetCenterY,
					}
					start = { x: hintLeft, y: hintTop + hintHeight / 2 }
				} else if (detail.dialog) {
					const dialogLeft = detail.dialog.left
					const dialogRight = detail.dialog.left + detail.dialog.width
					const dialogTop = detail.dialog.top
					const dialogBottom = detail.dialog.top + detail.dialog.height
					const margin = 16

					const canLeft = dialogLeft - margin - hintWidth > 0
					const canRight = dialogRight + margin + hintWidth < window.innerWidth
					const canTop = dialogTop - margin - hintHeight > 0
					const canBottom =
						dialogBottom + margin + hintHeight < window.innerHeight

					if (prefersLeft && canLeft) {
						placement = "left"
						hintLeft = dialogLeft - margin - hintWidth
						hintTop = ty - hintHeight / 2
					} else if (!prefersLeft && canRight) {
						placement = "right"
						hintLeft = dialogRight + margin
						hintTop = ty - hintHeight / 2
					} else if (canRight) {
						placement = "right"
						hintLeft = dialogRight + margin
						hintTop = ty - hintHeight / 2
					} else if (canLeft) {
						placement = "left"
						hintLeft = dialogLeft - margin - hintWidth
						hintTop = ty - hintHeight / 2
					} else if (canTop) {
						placement = "top"
						hintLeft = tx - hintWidth / 2
						hintTop = dialogTop - margin - hintHeight
					} else if (canBottom) {
						placement = "bottom"
						hintLeft = tx - hintWidth / 2
						hintTop = dialogBottom + margin
					}
				} else {
					const margin = 12
					const canLeft = target.left - margin - hintWidth > 0
					const canRight =
						target.left + target.width + margin + hintWidth < window.innerWidth

					if (prefersLeft && canLeft) {
						placement = "left"
						hintLeft = target.left - margin - hintWidth
						hintTop = ty - hintHeight / 2
					} else if (!prefersLeft && canRight) {
						placement = "right"
						hintLeft = target.left + target.width + margin
						hintTop = ty - hintHeight / 2
					}
				}

				hintLeft = clampWithin(hintLeft, 12, window.innerWidth - hintWidth - 12)
				hintTop = clampWithin(hintTop, 12, window.innerHeight - hintHeight - 12)

				start ??=
					placement === "right"
						? { x: hintLeft, y: hintTop + hintHeight / 2 }
						: placement === "left"
							? {
									x: hintLeft + hintWidth,
									y: hintTop + hintHeight / 2,
								}
							: placement === "top"
								? {
										x: hintLeft + hintWidth / 2,
										y: hintTop + hintHeight,
									}
								: { x: hintLeft + hintWidth / 2, y: hintTop }

				end ??= pointOnTargetHorizontalEdgeAtVerticalCenter(start.x, target)
				const dx = end.x - start.x
				const dy = end.y - start.y
				const distance = Math.hypot(dx, dy)
				const desiredAngle = Math.atan2(dy, dx)
				const rotationDeg =
					((desiredAngle - ARROW_BASE_ANGLE_RADIANS) * 180) / Math.PI
				const scale = clampWithin(distance / ARROW_BASE_LENGTH_PX, 0.15, 3)

				return (
					<React.Fragment key={detail.id}>
						<svg
							aria-hidden="true"
							className="absolute opacity-60"
							height={ARROW_SIZE}
							style={{
								color: "hsl(var(--foreground))",
								left: 0,
								top: 0,
								transform: `translate(${start.x}px, ${start.y}px) rotate(${rotationDeg}deg) scale(${scale}) translate(${-ARROW_TAIL_PX.x}px, ${-ARROW_TAIL_PX.y}px)`,
								transformOrigin: "top left",
							}}
							viewBox="0 0 415.262 415.261"
							width={ARROW_SIZE}
						>
							<use href="/graphics/arrow-256.svg#onboarding-arrow" />
						</svg>
						<DetailCallout
							copy={detail.copy}
							left={hintLeft}
							onSize={(size) => {
								setDetailCalloutSizes((prev) => {
									const existing = prev[detail.id]
									if (
										existing &&
										existing.width === size.width &&
										existing.height === size.height
									) {
										return prev
									}
									return { ...prev, [detail.id]: size }
								})
							}}
							top={hintTop}
						/>
					</React.Fragment>
				)
			})}
		</div>,
		portalEl,
	)
}
