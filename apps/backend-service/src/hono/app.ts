import { Hono } from "hono";

export const app = new Hono<{ Bindings: Env }>();

app.get("/", (c) => {
  return c.text("Hello World");
});

app.get("/health", (c) => {
  return c.text("Health");
});