import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "dist-electron/**",
      "build/output/**",
      "coverage/**",
      "playwright-report/**",
      "**/*.min.*",
    ],
  },
  {
    files: ["**/*.ts", "**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsparser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      vue: vuePlugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "vue/multi-word-component-names": "off",
    },
  },
];
