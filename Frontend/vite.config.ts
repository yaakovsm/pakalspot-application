import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: false,
    hmr: {
      port: 5173,
    },
    allowedHosts: "all",
    disableHostCheck: true,
    cors: true,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
