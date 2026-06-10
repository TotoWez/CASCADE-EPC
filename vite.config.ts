import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  // Pre-bundle the heavy PDF libs at startup. They are only reached through
  // dynamic import()s in the report menu; without this, Vite discovers them on
  // first click, re-optimizes, and aborts the in-flight import — surfacing as
  // "Failed to fetch dynamically imported module" when generating a report.
  optimizeDeps: {
    include: ["jspdf", "jspdf-autotable"],
  },
  build: {
    outDir: "dist",
    // No production source maps — keep app source out of the public bundle.
    sourcemap: false,
    // jsPDF + report builders are heavy; split them off the main bundle.
    rollupOptions: {
      output: {
        manualChunks: {
          pdf: ["jspdf", "jspdf-autotable"],
          vendor: ["react", "react-dom", "react-router-dom"],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.{test,spec}.{ts,tsx}", "src/**/*.{test,spec}.{ts,tsx}"],
  },
});
