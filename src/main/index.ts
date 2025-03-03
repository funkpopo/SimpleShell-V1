import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'

// 定义连接配置的数据类型
interface Connection {
  id: string
  name: string
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  description?: string
}

interface Organization {
  id: string
  name: string
  connections: Connection[]
}

// 连接配置文件路径
const connectionsFilePath = is.dev
  ? path.join(process.cwd(), 'connections.json')
  : path.join(app.getPath('userData'), 'connections.json')

// 加载连接配置
function loadConnections(): Organization[] {
  try {
    if (fs.existsSync(connectionsFilePath)) {
      const fileContent = fs.readFileSync(connectionsFilePath, 'utf-8')
      return JSON.parse(fileContent)
    }
  } catch (error) {
    console.error('加载连接配置失败:', error)
  }
  
  // 如果文件不存在或解析失败，返回默认配置
  return [
    {
      id: '1',
      name: '默认组织',
      connections: [
        {
          id: '1-1',
          name: '本地服务器',
          host: 'localhost',
          port: 22,
          username: 'root',
          description: '本地测试服务器'
        }
      ]
    }
  ]
}

// 保存连接配置
function saveConnections(organizations: Organization[]): boolean {
  try {
    const dirPath = path.dirname(connectionsFilePath)
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    
    fs.writeFileSync(connectionsFilePath, JSON.stringify(organizations, null, 2), 'utf-8')
    return true
  } catch (error) {
    console.error('保存连接配置失败:', error)
    return false
  }
}

// 获取CPU使用率
async function getCpuUsage(): Promise<number> {
  const startMeasure = os.cpus().map(cpu => ({
    idle: cpu.times.idle,
    total: Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0)
  }))

  await new Promise(resolve => setTimeout(resolve, 1000))

  const endMeasure = os.cpus().map(cpu => ({
    idle: cpu.times.idle,
    total: Object.values(cpu.times).reduce((acc, tv) => acc + tv, 0)
  }))

  const idleDifference = endMeasure[0].idle - startMeasure[0].idle
  const totalDifference = endMeasure[0].total - startMeasure[0].total
  return 100 - (idleDifference / totalDifference) * 100
}

// 获取系统信息
async function getSystemInfo() {
  const cpuUsage = await getCpuUsage()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  return {
    osInfo: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch()
    },
    cpuInfo: {
      usage: Math.round(cpuUsage * 100) / 100,
      model: os.cpus()[0].model,
      cores: os.cpus().length
    },
    memoryInfo: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usedPercentage: Math.round((usedMem / totalMem) * 100 * 100) / 100
    }
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // 系统监控IPC处理
  ipcMain.handle('get-system-info', async () => {
    return await getSystemInfo()
  })
  
  // 连接管理IPC处理
  ipcMain.handle('load-connections', () => {
    return loadConnections()
  })
  
  ipcMain.handle('save-connections', (_, organizations: Organization[]) => {
    return saveConnections(organizations)
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
