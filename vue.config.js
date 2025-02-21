const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.node$/,
          loader: 'node-loader',
          options: {
            name: '[name].[ext]'
          }
        }
      ]
    }
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: 'src/preload.ts',
      externals: ['node-pty', 'ssh2'],
      builderOptions: {
        productName: 'SimpleShell',
        appId: 'com.simpleshell.app',
        win: {
          icon: 'public/icon.ico',
          target: [
            {
              target: 'nsis',
              arch: ['x64']
            }
          ]
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true,
          createStartMenuShortcut: true
        }
      }
    }
  },
  devServer: {
    proxy: {
      '/ws': {
        target: 'ws://192.168.1.2:8080',
        ws: true,
        changeOrigin: true
      }
    }
  }
}) 