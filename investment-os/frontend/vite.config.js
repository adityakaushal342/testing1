import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend proxies /api to the backend on :4000 during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
