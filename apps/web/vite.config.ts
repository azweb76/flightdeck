import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 47322,
    proxy: {
      "/api": "http://127.0.0.1:47321",
    },
  },
  preview: {
    host: "127.0.0.1",
    port: 47322,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/@mui") || id.includes("node_modules/@emotion")) return "mui";
          if (
            id.includes("react-markdown") ||
            id.includes("remark-gfm") ||
            id.includes("rehype-sanitize") ||
            id.includes("node_modules/unified") ||
            id.includes("node_modules/mdast")
          ) {
            return "markdown";
          }
          return undefined;
        },
      },
    },
  },
});
