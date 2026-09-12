import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Listen on every interface so other machines on the network can reach
    // the dashboard at http://<your-lan-ip>:5173.
    host: true,
    // Requests arrive with the LAN IP or hostname in the Host header; Vite
    // blocks unknown hosts by default.
    allowedHosts: true,
    // Proxy keeps the browser on one origin: no CORS, and the Ola key
    // never leaves the backend. It runs on this machine, so it still talks
    // to the API over localhost.
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
