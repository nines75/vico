import { globalIgnores } from "eslint/config";
import { withVueTs, vueTsConfigs } from "@vue/eslint-config-typescript";
import { importX } from "eslint-plugin-import-x";
import js from "@eslint/js";
import prettier from "eslint-config-prettier/flat";
import unicorn from "eslint-plugin-unicorn";
import regex from "eslint-plugin-regexp";
import vue from "eslint-plugin-vue";
import stylistic from "@stylistic/eslint-plugin";

const isCi = process.env.CI === "true";

export default withVueTs(
  globalIgnores([".output/", ".wxt/"]),

  {
    files: ["**/*.{ts,vue}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      "@stylistic": stylistic,
    },
    extends: [
      js.configs.recommended,

      // https://github.com/un-ts/eslint-plugin-import-x
      importX.flatConfigs.typescript,

      // https://github.com/sindresorhus/eslint-plugin-unicorn
      unicorn.configs.recommended,

      // https://github.com/ota-meshi/eslint-plugin-regexp
      regex.configs.recommended,

      // https://github.com/vuejs/eslint-config-typescript
      vue.configs["flat/recommended"],
      vueTsConfigs.strictTypeChecked,
      vueTsConfigs.stylisticTypeChecked,
    ],
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
      "unicorn/consistent-boolean-name": "off",

      // -------------------------------------------------------------------------------------------
      // enable
      // -------------------------------------------------------------------------------------------

      eqeqeq: "error",
      "prefer-template": "error",
      "no-param-reassign": "error",
      "no-shadow": ["error", { allow: ["_"] }],

      // typescript-eslint
      "@typescript-eslint/consistent-type-imports": "warn",
      "@typescript-eslint/require-array-sort-compare": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/strict-boolean-expressions": [
        "error",
        {
          allowString: false,
          allowNumber: false,
          allowNullableObject: false,
        },
      ],

      // import-x
      "import-x/no-duplicates": "warn",
      "import-x/no-cycle": ["error", { maxDepth: isCi ? Infinity : 1 }],
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

      // stylistic
      "@stylistic/padding-line-between-statements": [
        "error",
        { blankLine: "always", prev: "*", next: "break" },
        { blankLine: "always", prev: "*", next: "continue" },
        { blankLine: "always", prev: "*", next: "return" },
      ],
    },
  },

  prettier,
);
