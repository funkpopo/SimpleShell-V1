import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import electron from 'vite-plugin-electron'
import { resolve } from 'path'
import { builtinModules } from 'module'

// 获取所有 Node.js 内置模块
const builtins = builtinModules.filter(x => !/^_|^(internal|v8|node-inspect)\/|\//.test(x))

export default defineConfig({
  root: resolve(__dirname, 'src/renderer'),
  plugins: [
    vue(),
    electron({
      entry: resolve(__dirname, 'src/main/index.ts'),
      onstart({ startup }) {
        if (process.env.NODE_ENV === 'development') {
          startup()
        }
      },
      vite: {
        build: {
          outDir: resolve(__dirname, 'dist/main'),
          rollupOptions: {
            external: [
              'electron',
              'electron-devtools-installer',
              'node-pty',
              'ssh2',
              'electron-store',
              ...builtins,
            ]
          }
        }
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  base: './',
  build: {
    outDir: resolve(__dirname, 'dist/renderer'),
    emptyOutDir: true,
    rollupOptions: {
      external: ['electron']
    }
  },
  server: {
    port: 5173
  }
}) 