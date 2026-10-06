import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
  },
  // Fresh cache folder so browsers can't reuse stale pre-bundled React chunks.
  cacheDir: "node_modules/.vite-slf",
  optimizeDeps: {
    // Pre-bundle everything up front so no mid-session re-optimization splits React into two copies.
    include: [
      "react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime",
      "@tanstack/react-query", "react-router-dom",
      "@radix-ui/react-dialog", "@radix-ui/react-slot", "@radix-ui/react-toast", "@radix-ui/react-tooltip",
      "class-variance-authority", "clsx", "tailwind-merge", "lucide-react", "sonner", "next-themes",
      "hypher", "hyphenation.de",
    ],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
}));