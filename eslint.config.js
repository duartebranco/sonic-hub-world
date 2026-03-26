import js from "@eslint/js";
import globals from "globals";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
            },
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            // Correctness
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-undef": "error",
            "eqeqeq": ["error", "always"],

            // Maintainability
            "no-var": "error",
            "prefer-const": "warn",

            // Console is common in game development
            "no-console": "off",
        },
    },
    {
        ignores: ["docs/", "models/", "animations/"],
    },
];
