import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { viteConfigData } from "./vite-config-data.js";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
  ],
  ...viteConfigData,
});
