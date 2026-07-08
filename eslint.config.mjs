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
    // tool scratch dirs, not source
    ".remember/**",
    "scripts/.remember/**",
    "test-results/**",
    "playwright-report/**",
  ]),
  {
    rules: {
      // Hydrating client state from localStorage in a mount effect is the
      // established pattern across this app (cart, lang, favorites). The
      // strict new rule flags every such setState; keep it advisory.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
