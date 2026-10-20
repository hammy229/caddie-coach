import { defineConfig } from "vitest/config";

// Only the TypeScript sources: `npm run build` also compiles the tests into dist/.
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
});
