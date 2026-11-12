import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiPort = process.env.FLIGHTDECK_PORT ?? "47321";
const webPort = Number(process.env.FLIGHTDECK_WEB_PORT ?? 47322);

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: webPort,
    proxy: {
      "/api": { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
    },
  },
  preview: { host: "127.0.0.1", port: webPort },
});
