import prettierPlugin from "eslint-plugin-prettier";
import typescriptParser from "@typescript-eslint/parser";
import globals from "globals";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default [
  {
    files: ["**/*.ts", "**/*.tsx"], // Include TypeScript files
    languageOptions: {
      parser: typescriptParser,
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // ESLint rules
      // "no-unused-vars": "error",
      // Prettier rules
      ...prettierPlugin.configs.recommended.rules,
    },
  },
  eslintPluginPrettierRecommended,
];
