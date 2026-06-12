import { DateTime } from "luxon"

const SEND_REPORT_ID = /^send_report:(weekly|monthly):(\d{4}-\d{2}-\d{2})$/

export function parseSendReportPayload(
	id: string,
): { reportType: "weekly" | "monthly"; dateISO: string } | null {
	const match = id.match(SEND_REPORT_ID)
	if (!match?.[1] || !match[2]) return null
	const reportType = match[1]
	if (reportType !== "weekly" && reportType !== "monthly") return null
	const dateISO = match[2]
	const parsed = DateTime.fromISO(dateISO, { zone: "UTC" })
	if (!parsed.isValid) return null
	return { reportType, dateISO }
}
