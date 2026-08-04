import { serveStatic } from "hono/bun";
import { createApp } from "./app";
import { createBlobStore } from "./storage/blob-store";

const store = createBlobStore();
const { app } = createApp({ store });
const webRoot = "./apps/web/dist";

if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: webRoot }));
  app.get("*", async () => {
    const index = Bun.file(`${webRoot}/index.html`);
    return (await index.exists())
      ? new Response(index, { headers: { "Content-Type": "text/html; charset=utf-8" } })
      : new Response("Web build not found", { status: 503 });
  });
}

const port = Number(process.env.API_PORT ?? process.env.PORT ?? 8789);

export default {
  port,
  fetch: app.fetch,
  maxRequestBodySize: Number(process.env.MAX_UPLOAD_BYTES ?? 100 * 1024 * 1024) + 1024 * 1024,
};

console.log(`Zo Moments listening on http://127.0.0.1:${port}`);
