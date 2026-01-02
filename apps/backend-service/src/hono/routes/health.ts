import { Hono } from "hono"

export const healthRouter = new Hono<{ Bindings: Env }>()

healthRouter.get("/health", (c) => c.text("Health"))
