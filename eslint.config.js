import js from "@eslint/js";
import { globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import { importX } from "eslint-plugin-import-x";
import unicorn from "eslint-plugin-unicorn";
import regex from "eslint-plugin-regexp";
import vue from "eslint-plugin-vue";
import { withVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";

const isCi = process.env.CI === "true";

export default withVueTs(
  globalIgnores([".output/", ".wxt/", "eslint.config.js"]),

  js.configs.recommended,

  // https://github.com/un-ts/eslint-plugin-import-x
  importX.flatConfigs.typescript,

  // https://github.com/sindresorhus/eslint-plugin-unicorn
  unicorn.configs.recommended,

  // https://github.com/ota-meshi/eslint-plugin-regexp
  regex.configs.recommended,

  // https://github.com/vuejs/eslint-config-typescript
  ...vue.configs["flat/recommended"],
  vueTsConfigs["strictTypeChecked"],
  vueTsConfigs["stylisticTypeChecked"],

  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      // -------------------------------------------------------------------------------------------
      // error => warn
      // -------------------------------------------------------------------------------------------

      "no-empty": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "@typescript-eslint/require-await": "warn",
      "@typescript-eslint/no-unnecessary-condition": "warn",

      // -------------------------------------------------------------------------------------------
      // change options
      // -------------------------------------------------------------------------------------------

      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowAny: false,
          allowBoolean: false,
          allowNullish: false,
          allowRegExp: false,
        },
      ],
      "unicorn/filename-case": [
        "error",
        {
          cases: {
            kebabCase: true,
            pascalCase: true,
          },
        },
      ],

      // -------------------------------------------------------------------------------------------
      // disable
      // -------------------------------------------------------------------------------------------

      "vue/multi-word-component-names": "off",
      "unicorn/name-replacements": "off",
      "unicorn/no-null": "off",
      "unicorn/no-break-in-nested-loop": "off",
      "unicorn/require-array-sort-compare": "off",
      "unicorn/max-nested-calls": "off",
      "unicorn/prefer-else-if": "off",
      "unicorn/isolated-functions": "off",
      "unicorn/consistent-boolean-name": "off",

      // -------------------------------------------------------------------------------------------
      // enable
      // -------------------------------------------------------------------------------------------

      eqeqeq: "error",
      "no-param-reassign": "error",
      "no-shadow": ["error", { allow: ["_"] }],
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
        },
      ],
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: ["./entrypoints/content/**/*"],
              from: "./utils/storage-write.ts",
            },
          ],
        },
      ],
      "import-x/no-cycle": ["error", { maxDepth: isCi ? Infinity : 1 }],
    },
  },

  prettier,
);
