import { Hono } from "hono";
import type { EventsResponse } from "../shared/event.js";
import { FAKE_EVENTS } from "./fake-events.js";

// All routes live under /api. In production Vercel serves the page itself as static files
// and sends only /api/* requests here; in development the Vite plugin does the same.
const app = new Hono().basePath("/api");

app.get("/events", (c) => {
  const body: EventsResponse = { events: FAKE_EVENTS };
  return c.json(body);
});

export default app;
