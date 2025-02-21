import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { setupSSH } from './ssh'
import { setupStore } from './store'
import { setupShortcuts, clearShortcuts } from './shortcuts'

// 开发环境标识
const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

async function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  })

  // 根据开发环境加载不同的页面
  if (isDev) {
    // 开发环境：加载本地服务
    await mainWindow.loadURL('http://localhost:5173')
    // 打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境：加载打包后的文件
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // 设置各种功能
  await setupStore(mainWindow)
  setupSSH(mainWindow)
  setupShortcuts(mainWindow)
}

// 应用程序准备就绪时创建窗口
app.whenReady().then(async () => {
  if (isDev) {
    try {
      const { default: installExtension, VUEJS_DEVTOOLS } = await import('electron-devtools-installer')
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e)
    }
  }
  await createWindow()

  // macOS 应用程序激活时重新创建窗口
  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
})

// 关闭所有窗口时退出应用
app.on('window-all-closed', () => {
  clearShortcuts()
  if (process.platform !== 'darwin') {
    app.quit()
  }
}) 