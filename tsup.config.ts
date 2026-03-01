import { defineConfig } from "tsup";

export default defineConfig({
  entry: [
    "src/index.ts",
    "src/testing.ts",
    "src/interfaces/slack/index.ts",
    "src/interfaces/slack/testing.ts",
  ],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
});
