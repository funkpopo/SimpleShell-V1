const { defineConfig } = require('@vue/cli-service')
const path = require('path')

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    host: 'localhost',
    port: 8080
  },
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      },
      extensions: ['.js', '.vue', '.json', '.ts', '.tsx']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                appendTsSuffixTo: [/\.vue$/],
                transpileOnly: true
              }
            }
          ],
          exclude: /node_modules/
        },
        {
          test: /\.node$/,
          loader: 'node-loader'
        }
      ]
    }
  },
  pluginOptions: {
    electronBuilder: {
      nodeIntegration: true,
      externals: ['ssh2', 'node-pty', 'cpu-features'],
      chainWebpackMainProcess: (config) => {
        // Chain webpack config for electron main process
        config.module
          .rule('typescript')
          .test(/\.tsx?$/)
          .use('ts-loader')
          .loader('ts-loader')
          .options({
            transpileOnly: true
          })
          .end()

        // 为 .node 文件配置 node-loader
        config.module
          .rule('node')
          .test(/\.node$/)
          .use('node-loader')
          .loader('node-loader')
          .end()
      },
      chainWebpackRendererProcess: (config) => {
        // 为渲染进程配置 node-loader
        config.module
          .rule('node')
          .test(/\.node$/)
          .use('node-loader')
          .loader('node-loader')
          .end()

        // 为渲染进程配置 ts-loader
        config.module
          .rule('typescript')
          .test(/\.tsx?$/)
          .use('ts-loader')
          .loader('ts-loader')
          .options({
            transpileOnly: true,
            appendTsSuffixTo: [/\.vue$/]
          })
          .end()
      },
      mainProcessFile: 'src/main/background.ts',
      rendererProcessFile: 'src/renderer/main.ts',
      mainProcessWatch: ['src/main'],
      builderOptions: {
        appId: 'com.simpleshell.app',
        productName: 'SimpleShell',
        directories: {
          output: 'dist_electron'
        },
        files: [
          "**/*",
          "!**/node_modules/*/{CHANGELOG.md,README.md,README,readme.md,readme}",
          "!**/node_modules/*/{test,__tests__,tests,powered-test,example,examples}",
          "!**/node_modules/*.d.ts",
          "!**/node_modules/.bin",
          "!**/*.{iml,o,hprof,orig,pyc,pyo,rbc,swp,csproj,sln,xproj}",
          "!.editorconfig",
          "!**/._*",
          "!**/{.DS_Store,.git,.hg,.svn,CVS,RCS,SCCS,.gitignore,.gitattributes}",
          "!**/{__pycache__,thumbs.db,.flowconfig,.idea,.vs,.nyc_output}",
          "!**/{appveyor.yml,.travis.yml,circle.yml}",
          "!**/{npm-debug.log,yarn.lock,.yarn-integrity,.yarn-metadata.json}"
        ],
        win: {
          target: ['nsis']
        },
        linux: {
          target: ['AppImage', 'deb']
        },
        nsis: {
          oneClick: false,
          allowToChangeInstallationDirectory: true,
          createDesktopShortcut: true
        },
        extraResources: [
          {
            from: 'node_modules/node-pty/build/Release/',
            to: 'node_modules/node-pty/build/Release/',
            filter: ['**/*']
          },
          {
            from: 'node_modules/ssh2/lib/protocol/crypto/build/Release/',
            to: 'node_modules/ssh2/lib/protocol/crypto/build/Release/',
            filter: ['**/*']
          }
        ]
      }
    }
  }
}) 