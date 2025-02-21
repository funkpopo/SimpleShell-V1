import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import './ssh-manager' // 导入SSH管理器
import { terminalManager } from './terminal-manager'
import { sshManager } from './ssh-manager'
import * as pty from 'node-pty'
import * as os from 'os'
import { setupSSHHandlers } from './main/ssh-handler'

const isDevelopment = process.env.NODE_ENV !== 'production'

// 保持窗口对象的全局引用
let win: BrowserWindow | null = null

// 终端进程管理
const terminals = new Map<string, pty.IPty>()

// 设置 IPC 处理程序
function setupIPC() {
  // 终端相关
  ipcMain.handle('terminal-create', async (event, { id, cols, rows }) => {
    try {
      const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
      const terminal = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: os.homedir(),
        env: process.env as { [key: string]: string }
      })

      terminals.set(id, terminal)

      terminal.onData(data => {
        if (win) {
          win.webContents.send(`terminal-data-${id}`, data)
        }
      })

      return { success: true }
    } catch (error) {
      console.error('Failed to create terminal:', error)
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.on('terminal-write', (event, { id, data }) => {
    const terminal = terminals.get(id)
    if (terminal) {
      terminal.write(data)
    }
  })

  ipcMain.on('terminal-resize', (event, { id, cols, rows }) => {
    const terminal = terminals.get(id)
    if (terminal) {
      terminal.resize(cols, rows)
    }
  })

  ipcMain.on('terminal-close', (event, id) => {
    const terminal = terminals.get(id)
    if (terminal) {
      terminal.kill()
      terminals.delete(id)
    }
  })
}

// 定义自定义协议
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // 创建浏览器窗口
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: process.env.NODE_ENV !== 'production',
      contextIsolation: process.env.NODE_ENV === 'production',
      preload: path.join(__dirname, 'preload.js')
    },
    frame: true,
    backgroundColor: '#1e1e1e'
  })

  // 移除菜单栏
  win.setMenu(null)

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // 如果在开发环境，加载开发服务器URL
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // 在生产环境下加载 index.html
    win.loadURL('app://./index.html')
  }
}

// 当所有窗口都被关闭时退出应用
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// 初始化完成时创建窗口
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Vue Devtools failed to install:', error.message)
      }
    }
  }
  
  setupIPC()
  setupSSHHandlers()
  createWindow()
})

// 在开发模式下，根据父进程的请求干净地退出
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
} 