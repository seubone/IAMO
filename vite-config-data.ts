import path from "path";

// This file exports only the vite configuration data WITHOUT importing vite
// This prevents vite from being bundled by esbuild
export const viteConfigData = {
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 5000,
    strictPort: true,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://localhost:5051",
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path: string) => path,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
};
