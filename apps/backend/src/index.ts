import { WorkerEntrypoint } from "cloudflare:workers"
import { initDatabase } from "@repo/db/database/setup"
import { updateExchangeRates } from "@/cron/updateExchangeRates.js"
import { app } from "@/hono/app"

export { AgentServer } from "@/durable-objects/AgentServer"
export { NotificationScheduler } from "@/durable-objects/NotificationScheduler"
//test comment

export default class DataService extends WorkerEntrypoint<Env> {
	override fetch(request: Request) {
		initDatabase(this.env.DB)
		return app.fetch(request, this.env, this.ctx)
	}

	override scheduled(controller: ScheduledController) {
		initDatabase(this.env.DB)
		switch (controller.cron) {
			case "0 0 * * *":
				this.ctx.waitUntil(updateExchangeRates(this.env))
				break
			default:
				break
		}
	}
}
