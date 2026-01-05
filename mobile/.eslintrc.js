// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ["expo"],
  ignorePatterns: ["dist/*"],
  rules: {
    // Disable rules that require ESLint 9
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-wrapper-object-types": "off",
  },
};

