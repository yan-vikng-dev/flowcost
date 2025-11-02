// Backfill ISO date-only columns using per-user timezone
// Requires env: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN
// Run: pnpm -F data-ops backfill:date-only

import { DateTime } from "luxon"

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID
const DATABASE_ID = process.env.CLOUDFLARE_DATABASE_ID
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN
const API_URL = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`

if (!ACCOUNT_ID || !DATABASE_ID || !TOKEN) {
	console.error(
		"Missing Cloudflare D1 credentials. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_D1_TOKEN",
	)
	process.exit(1)
}

async function d1Query(sql, params = []) {
	const res = await fetch(API_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${TOKEN}`,
		},
		body: JSON.stringify({ sql, params }),
	})
	if (!res.ok) {
		const text = await res.text()
		throw new Error(`D1 HTTP error ${res.status}: ${text}`)
	}
	const data = await res.json()
	if (!data.success) {
		throw new Error(`D1 query failed: ${JSON.stringify(data)}`)
	}
	const result = data.result?.[0]
	if (!result?.success) {
		throw new Error(`D1 result failed: ${JSON.stringify(result)}`)
	}
	return result
}

function toIsoDateInTimezoneMs(ms, timezone) {
	return DateTime.fromMillis(ms, { zone: timezone }).toISODate()
}

async function backfillTemplates(batch = 200) {
	console.log("Backfilling recurring_entry_templates.dtstart_date/end_date ...")
	let offset = 0
	let totalUpdated = 0
	while (true) {
		const selectSql = `
      SELECT t.id, t.user_id, t.dtstart, t.end_at, t.dtstart_date, t.end_date, p.timezone
      FROM recurring_entry_templates t
      JOIN user_preferences p ON p.user_id = t.user_id
      WHERE t.dtstart_date IS NULL OR (t.end_at IS NOT NULL AND t.end_date IS NULL)
      LIMIT ? OFFSET ?
    `
		const res = await d1Query(selectSql, [batch, offset])
		const rows = res.results ?? []
		if (rows.length === 0) break
		const updates = []
		for (const row of rows) {
			const tz = row.timezone || "UTC"
			const patch = {
				id: row.id,
				dtstartDate: row.dtstart_date,
				endDate: row.end_date,
			}
			if (!patch.dtstartDate && row.dtstart != null) {
				patch.dtstartDate = toIsoDateInTimezoneMs(row.dtstart, tz)
			}
			if (!patch.endDate && row.end_at != null) {
				patch.endDate = toIsoDateInTimezoneMs(row.end_at, tz)
			}
			if (patch.dtstartDate || patch.endDate) {
				updates.push(patch)
			}
		}
		if (updates.length > 0) {
			for (const u of updates) {
				const stmt = `UPDATE recurring_entry_templates SET dtstart_date = COALESCE(dtstart_date, ?), end_date = COALESCE(end_date, ?) WHERE id = ?`
				const params = [u.dtstartDate ?? null, u.endDate ?? null, u.id]
				await d1Query(stmt, params)
				totalUpdated += 1
				if (totalUpdated % 100 === 0) {
					console.log(`  updated ${totalUpdated} template rows so far`)
				}
			}
			console.log(`  updated ${totalUpdated} template rows so far`)
		}
		offset += rows.length
	}
	console.log(`Templates backfill done. Total updated: ${totalUpdated}`)
}

async function backfillEntries(batch = 500) {
	console.log("Backfilling entries.executed_date ...")
	let offset = 0
	let totalUpdated = 0
	while (true) {
		const selectSql = `
      SELECT e.id, e.executed_at, e.executed_date, p.timezone
      FROM entries e
      JOIN user_preferences p ON p.user_id = e.user_id
      WHERE e.executed_date IS NULL
      LIMIT ? OFFSET ?
    `
		const res = await d1Query(selectSql, [batch, offset])
		const rows = res.results ?? []
		if (rows.length === 0) break
		const updates = []
		for (const row of rows) {
			const tz = row.timezone || "UTC"
			if (row.executed_at == null) continue
			const iso = toIsoDateInTimezoneMs(row.executed_at, tz)
			updates.push({ id: row.id, iso })
		}
		if (updates.length > 0) {
			for (const u of updates) {
				const stmt = `UPDATE entries SET executed_date = ? WHERE id = ?`
				const params = [u.iso, u.id]
				await d1Query(stmt, params)
				totalUpdated += 1
				if (totalUpdated % 500 === 0) {
					console.log(`  updated ${totalUpdated} entry rows so far`)
				}
			}
			console.log(`  updated ${totalUpdated} entry rows so far`)
		}
		offset += rows.length
	}
	console.log(`Entries backfill done. Total updated: ${totalUpdated}`)
}

async function main() {
	await backfillTemplates()
	await backfillEntries()
}

main().catch((err) => {
	console.error(err)
	process.exit(1)
})
