import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    themePlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? []
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
      // Mock React Native components for web
      "react-native": "react-native-web",
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      external: (id) => {
        // Externalize all expo and react-native modules
        if (id.includes('@rollup/rollup-linux-x64-gnu') ||
            id.includes('expo-router') ||
            id.includes('expo') ||
            id.includes('react-native') ||
            id.includes('@expo') ||
            id.includes('expo-') ||
            id.includes('@react-native')) {
          return true;
        }
        return false;
      },
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
      ignore: ['expo-router', 'expo', 'react-native', '@expo'],
    },
  },
  optimizeDeps: {
    exclude: [
      "@rollup/rollup-linux-x64-gnu",
      "expo-router",
      "expo",
      "react-native",
      "@expo",
      "@react-native"
    ],
    force: true,
  },
  esbuild: {
    target: 'es2020',
  },
});
