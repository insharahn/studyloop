import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Backend's CORS_ORIGINS only whitelists localhost:3000 (dev) and
    // studyloop.vercel.app (prod). We can't touch the backend, so the dev
    // server matches that existing whitelist instead of Vite's 5173
    // default -- otherwise every request gets CORS-blocked.
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
