import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    emptyOutDir: false,

    lib: {
      entry: resolve(__dirname, 'src/index.mts'),
      name: 'index',
      fileName: 'index',
      formats: ['es', 'umd'],
    },
  },
})
