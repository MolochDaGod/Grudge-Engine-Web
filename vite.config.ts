import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// Plugin to handle Babylon.js shader files
const babylonShaderPlugin = {
  name: 'babylon-shader',
  resolveId(id) {
    if (id.includes('default.vertex') || id.includes('default.fragment') || 
        id.endsWith('.vertex.fx') || id.endsWith('.fragment.fx')) {
      return { id, moduleSideEffects: false };
    }
  },
  load(id) {
    if (id.includes('default.vertex') || id.includes('default.fragment') || 
        id.endsWith('.vertex.fx') || id.endsWith('.fragment.fx')) {
      return 'export default "";';
    }
  }
};

export default defineConfig({
  plugins: [
    babylonShaderPlugin,
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
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
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  optimizeDeps: {
    exclude: ['@babylonjs/core']
  }
});
