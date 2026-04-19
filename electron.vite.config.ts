import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { "@main": resolve("src/main") } },
    build: { outDir: "dist-electron/main" },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias: { "@preload": resolve("src/preload") } },
    build: { outDir: "dist-electron/preload" },
  },
  renderer: {
    root: "src/renderer",
    plugins: [vue(), tailwindcss()],
    resolve: { alias: { "@renderer": resolve("src/renderer") } },
    build: { outDir: "dist-electron/renderer" },
  },
});
