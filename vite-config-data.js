import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine frontend and backend ports
const FRONTEND_PORT = parseInt(process.env.FRONTEND_PORT || "5000", 10);
const BACKEND_PORT = parseInt(process.env.PORT || "5051", 10);

export const viteConfigData = {
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: FRONTEND_PORT,
    strictPort: true,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: `http://localhost:${BACKEND_PORT}`,
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
};
