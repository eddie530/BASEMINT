import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/lib/resident-pro.test.ts", "src/lib/independent-preview-policy.test.ts", "src/lib/resident-independent-ai.test.ts", "src/lib/independent-mocks.test.ts"],
  },
});
