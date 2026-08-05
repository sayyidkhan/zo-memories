import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appBasePath = `/${(process.env.APP_BASE_PATH ?? "").replace(/^\/+|\/+$/g, "")}`;
const base = appBasePath === "/" ? "/" : `${appBasePath}/`;

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:8789",
      "/auth": "http://127.0.0.1:8789",
      "/health": "http://127.0.0.1:8789",
      "/public": "http://127.0.0.1:8789",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
