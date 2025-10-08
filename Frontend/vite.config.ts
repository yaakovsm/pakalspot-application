import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Commented out - causes container issues

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173,
    },
    allowedHosts: ["all", "pakalspot.local"], // Added missing comma
    disableHostCheck: true,
    cors: true,
  },
  plugins: [react()], // Removed problematic componentTagger plugin
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
