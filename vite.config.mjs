import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: true,

    lib: {
      entry: resolve(__dirname, 'src/runtime/browser/index.mts'),
      name: 'index',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
  },
})
