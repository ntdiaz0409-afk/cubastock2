import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // El frontend fue construido antes de las reglas del compilador React
      // 19. Mantener estos avisos permite modernizar hooks por módulo sin
      // reescribir de golpe autenticación, ventas y modo offline.
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/static-components': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
])
/**
 * Propósito: reglas estáticas de calidad para el código React.
 * Responsabilidades: combinar las configuraciones recomendadas y excluir artefactos de compilación.
 * Dependencias: ESLint, React Hooks y plugin React Refresh.
 */
