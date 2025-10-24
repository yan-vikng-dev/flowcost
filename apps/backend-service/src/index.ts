import { WorkerEntrypoint } from "cloudflare:workers"
import { initDatabase } from "@repo/data-ops/database/setup"
import { updateExchangeRates } from "@/handlers/updateExchangeRates.js"
import { app } from "@/hono/app"

export { AiConversationServer } from "@/durable-objects/Assistant/AiConversationServer"

export default class DataService extends WorkerEntrypoint<Env> {
	fetch(request: Request) {
		initDatabase(this.env.DB)
		return app.fetch(request, this.env, this.ctx)
	}

	scheduled(controller: ScheduledController) {
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
