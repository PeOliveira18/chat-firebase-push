// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'server/*', 'tests/*'],
  },
  {
    rules: {
      // O enunciado proíbe o uso de `any`.
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]);
