// Single-page build with no server: the market runs in the browser (see client/src/localApi.ts).
// React comes from a CDN script tag, so it's left out of the bundle.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  plugins: [react()],
  define: { "import.meta.env.VITE_STANDALONE": JSON.stringify("1") },
  build: {
    outDir: "../dist-standalone",
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      input: "client/src/main.tsx",
      external: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"],
      output: {
        format: "iife",
        entryFileNames: "app.js",
        assetFileNames: "app.[ext]",
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          "react-dom/client": "ReactDOM",
          "react/jsx-runtime": "GandiJSX",
        },
      },
    },
  },
});
