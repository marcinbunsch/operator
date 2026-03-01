import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "packages/**/tests/**/*.test.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "packages/**/src/index.ts"],
      reporter: ["text", "html"],
    },
  },
});
