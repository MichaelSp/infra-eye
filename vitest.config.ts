import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tailwindcss(), svelte({ hot: !process.env.VITEST })],
  resolve: {
    alias: {
      $lib: path.resolve("./src/lib"),
    },
    // Ensure Vitest resolves browser entry points (e.g., svelte/index.js with mount)
    conditions: ["browser"],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,ts}"],
  },
});
