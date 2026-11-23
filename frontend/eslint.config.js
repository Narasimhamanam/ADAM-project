import globals from 'globals'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [{
  files: ['src/**/*.{js,jsx}'],
  languageOptions: {
    ecmaVersion: 'latest', sourceType: 'module',
    parserOptions: { ecmaFeatures: { jsx: true } },
    globals: { ...globals.browser, ...globals.node },
  },
  plugins: {
    'react': reactPlugin,
    'react-hooks': reactHooks
  },
  rules: {
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-dupe-keys': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    'react/jsx-no-undef': ['error', { allowGlobals: true }],
    'react-hooks/rules-of-hooks': 'error',
  },
}]
