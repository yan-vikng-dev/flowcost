import { WorkerEntrypoint } from "cloudflare:workers";
import { app } from "@/hono/app";
import { updateExchangeRates } from "@/handlers/updateExchangeRates.js";
import { initDatabase } from "@repo/data-ops/database/setup";

export default class DataService extends WorkerEntrypoint<Env> {
  
  fetch(request: Request) {
    initDatabase(this.env.DB);
    return app.fetch(request, this.env, this.ctx);
  }

  async scheduled(controller: ScheduledController) {
    initDatabase(this.env.DB);
    switch (controller.cron) {
      case "0 0 * * *":
        this.ctx.waitUntil(updateExchangeRates(controller, this.env, this.ctx))
      default:
        break;
    }
  }
}
