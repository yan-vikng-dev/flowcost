import { WorkerEntrypoint } from "cloudflare:workers"
import { initDatabase } from "@repo/db/database/setup"
import { app } from "@/hono/app"

export { AgentServer } from "@/durable-objects/AgentServer"
export { NotificationScheduler } from "@/durable-objects/NotificationScheduler"

export default class DataService extends WorkerEntrypoint<Env> {
	override fetch(request: Request) {
		initDatabase(this.env.DB)
		return app.fetch(request, this.env, this.ctx)
	}
}
