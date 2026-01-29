module.exports = {
  extends: ["next/core-web-vitals", "next/typescript"],
  rules: {
    // Disable unused vars error for underscore-prefixed args
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
