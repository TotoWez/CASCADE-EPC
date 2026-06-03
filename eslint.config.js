import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "playwright-report", "test-results", "coverage", "supabase"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Supabase row mappers legitimately use `any`; non-null assertions are deliberate.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      // TS already enforces unused locals/params at build; keep lint advisory.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-empty-function": "off",
      // Allow concise side-effect ternaries / short-circuits (toggle helpers, etc.).
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
      // The jsPDF sanitizer intentionally strips control characters.
      "no-control-regex": "off",
    },
  },
  {
    files: ["**/*.config.{ts,js}", "playwright.config.ts", "e2e/**", "scripts/**"],
    languageOptions: { sourceType: "module", globals: { ...globals.node } },
  },
);
