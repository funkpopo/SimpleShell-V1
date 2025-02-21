const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const isDev = process.env.NODE_ENV === 'development'
require('@electron/remote/main').initialize()

// 设置原生模块加载路径
if (isDev) {
  app.commandLine.appendSwitch('--no-sandbox')
  app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096')
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      enableRemoteModule: true
    }
  })

  require('@electron/remote/main').enable(win.webContents)

  if (isDev) {
    // 在开发环境中加载开发服务器URL
    try {
      await win.loadURL('http://localhost:5173')
      win.webContents.openDevTools()
    } catch (e) {
      console.error('Failed to load dev server:', e)
    }
  } else {
    // 在生产环境中加载打包后的文件
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  }

  // 处理新窗口打开
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
}) 