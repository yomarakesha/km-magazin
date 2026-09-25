import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served by the backend at /admin in production (see backend/app/main.py);
// in dev the proxy keeps API calls same-origin so the session cookie works.
const API = process.env.API_URL ?? "http://localhost:8000";

export default defineConfig({
  base: "/admin/",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/api": API, "/media": API },
  },
});
