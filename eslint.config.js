import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  // app-shell：app 分支的 Capacitor 壳工程（含 www 压缩产物与原生模板），不参与 Web 代码质量门禁
  { ignores: ['dist', 'node_modules', 'public/sw.js', '.vitepress', 'docs-site/.vitepress/dist', 'docs-site/docs/knowledge', 'app-shell', '*-probe*.mjs', 'manual-accept.mjs', 'touch-probe-temp.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs', 'docs-site/**/*.mjs'],
    languageOptions: {
      globals: { URL: 'readonly', console: 'readonly', process: 'readonly' },
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // React Compiler 严格建议（refs/immutability/set-state-in-effect）；本项目 React 18 使用标准模式，关闭
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // O3 复杂度治理：新增代码须保持低圈复杂度；既有超限模块在文件内显式豁免并逐步拆分
      complexity: ['warn', { max: 30 }],
      'max-lines': ['warn', { max: 900, skipBlankLines: true, skipComments: true }],
    },
  },
)
