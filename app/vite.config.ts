import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In dev the editor runs on :5173 and proxies API/preview/published routes to
// the Express server on :4000. In production the API serves the built app, so
// these same relative paths resolve on the same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/s": "http://localhost:4000",
      "/uploads": "http://localhost:4000",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
