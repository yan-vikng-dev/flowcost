import { Hono } from "hono"
import { healthRouter } from "@/hono/routes/health"
import { reportsRouter } from "@/hono/routes/reports"
import { whatsappRouter } from "@/hono/routes/whatsapp"

export const app = new Hono<{ Bindings: Env }>()

app.route("/", healthRouter)
app.route("/", whatsappRouter)
app.route("/", reportsRouter)
