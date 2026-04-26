import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-restricted-imports": ["error", {
        "patterns": [{
          "group": ["**/lib/platforms/*", "**/lib/worker/*"],
          "message": "Platform SDKs and Worker logic are server-only. Use Server Actions or API routes instead."
        }]
      }]
    }
  },
  {
    files: ["src/__tests__/**/*.ts", "src/__tests__/**/*.tsx"],
    rules: {
      "no-restricted-imports": "off"
    }
  }
]);

export default eslintConfig;
