/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["test/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json"],
      reportsDirectory: "coverage",
      include: [
        "src/pages/Login.tsx",
        "src/context/AuthContext.tsx",
        "src/components/ProtectedRoute.tsx",
        "src/pages/Dashboard.tsx",
      ],
      all: true,
    },
  },
});
