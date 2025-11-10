import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // force all imports to use the single installed copy
      '@codemirror/state': path.resolve(__dirname, 'node_modules/@codemirror/state'),
      '@codemirror/view':  path.resolve(__dirname, 'node_modules/@codemirror/view'),
      '@codemirror/basic-setup': path.resolve(__dirname, 'node_modules/@codemirror/basic-setup'),
      '@codemirror/lang-html': path.resolve(__dirname, 'node_modules/@codemirror/lang-html'),
    }
  }
})
