import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Plugin to handle Babylon.js shader files
const babylonShaderPlugin = {
  name: 'babylon-shader',
  resolveId(id: string) {
    if (id.includes('default.vertex') || id.includes('default.fragment') || 
        id.endsWith('.vertex.fx') || id.endsWith('.fragment.fx')) {
      return { id, moduleSideEffects: false };
    }
  },
  load(id: string) {
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
      strict: false,
    },
  },
  optimizeDeps: {
    exclude: ['@babylonjs/core']
  }
});
