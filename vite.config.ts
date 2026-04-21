import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // TanStack Router plugin must run BEFORE @vitejs/plugin-react.
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
    VitePWA({
      // Use our hand-authored manifest in /public rather than re-generating it.
      manifest: false,
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      registerType: "autoUpdate",
      injectRegister: null, // we register manually so we can show an update prompt
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,json}"],
      },
      devOptions: {
        // Keep the SW disabled in `vite dev` — it interferes with HMR. We
        // verify the SW in a production build (`npm run build && vite preview`).
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
