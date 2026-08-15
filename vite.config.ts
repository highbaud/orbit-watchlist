import path from "node:path";
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(root, "src") },
  },
  build: {
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(root, "popup.html"),
        sidepanel: path.resolve(root, "sidepanel.html"),
        background: path.resolve(root, "src/background.ts"),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === "background" ? "assets/background.js" : "assets/[name]-[hash].js",
        chunkFileNames: "assets/chunk-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
        manualChunks: {
          "vendor-react": ["react", "react-dom"],
          "vendor-base-ui": ["@base-ui/react"],
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
          "vendor-icons": ["@phosphor-icons/react"],
        },
      },
    },
  },
});
