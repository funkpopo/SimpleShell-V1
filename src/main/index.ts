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

// 输出环境信息
console.log('应用环境:', is.dev ? '开发环境' : '生产环境')
console.log('连接配置文件路径:', connectionsFilePath)
console.log('当前工作目录:', process.cwd())

// 加载连接配置
function loadConnections(): Organization[] {
  try {
    if (fs.existsSync(connectionsFilePath)) {
      const fileContent = fs.readFileSync(connectionsFilePath, 'utf-8')
      // 如果文件存在但为空或内容无效，返回空数组
      if (!fileContent.trim()) {
        console.log('配置文件存在但为空，返回空数组')
        return []
      }
      
      try {
        const parsed = JSON.parse(fileContent)
        // 确认解析出的内容是数组
        if (Array.isArray(parsed)) {
          return parsed
        } else {
          console.warn('配置文件内容不是有效数组，返回空数组')
          return []
        }
      } catch (parseError) {
        console.error('解析配置文件失败:', parseError)
        return []
      }
    }
  } catch (error) {
    console.error('加载连接配置失败:', error)
  }
  
  // 如果文件不存在，返回空数组
  console.log('配置文件不存在，返回空数组')
  return []
}

// 保存连接配置
function saveConnections(organizations: Organization[]): boolean {
  try {
    const dirPath = path.dirname(connectionsFilePath)
    
    // 确保目录存在
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
    
    // 在开发环境中，额外打印路径信息
    if (is.dev) {
      console.log('保存连接配置到:', connectionsFilePath)
      // 数据可能很大，只打印长度信息
      console.log('保存数据:', Array.isArray(organizations) ? `${organizations.length}个组织` : '非数组')
    }
    
    // 检查organizations是否为数组
    if (!Array.isArray(organizations)) {
      console.error('保存失败: organizations不是数组')
      return false
    }
    
    // 检查数组是否为空 - 允许空数组
    if (organizations.length === 0) {
      console.log('保存的是空数组配置 - 允许')
    }
    
    // 以同步方式写入文件
    const jsonContent = JSON.stringify(organizations, null, 2)
    fs.writeFileSync(connectionsFilePath, jsonContent, { encoding: 'utf-8', flag: 'w' })
    console.log('文件写入完成，内容长度:', jsonContent.length, '字节')
    
    // 验证写入是否成功
    if (fs.existsSync(connectionsFilePath)) {
      const stats = fs.statSync(connectionsFilePath)
      console.log('文件大小:', stats.size, '字节')
      
      // 验证内容是否正确写入
      const readContent = fs.readFileSync(connectionsFilePath, 'utf-8')
      const success = readContent.length > 0 && readContent === jsonContent
      console.log('内容验证:', success ? '成功' : '失败')
      
      // 内容验证不再做额外处理，避免无限循环
    }
    
    return true
  } catch (error) {
    console.error('保存连接配置失败，错误详情:', error)
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

  // 确保连接配置文件已初始化并有效
  console.log('应用启动，初始化连接配置文件')
  
  let configExists = false

  // 检查文件是否存在
  if (fs.existsSync(connectionsFilePath)) {
    configExists = true
    console.log('配置文件已存在:', connectionsFilePath)
  } else {
    console.log('配置文件不存在，将创建空配置')
    // 创建空的配置文件
    saveConnections([])
  }
  
  // 系统监控IPC处理
  ipcMain.handle('get-system-info', async () => {
    return await getSystemInfo()
  })
  
  // 连接管理IPC处理
  ipcMain.handle('load-connections', () => {
    console.log('收到加载连接配置请求')
    return loadConnections()
  })
  
  ipcMain.handle('save-connections', (_, organizations: Organization[]) => {
    console.log('主进程收到保存请求，数据大小:', Array.isArray(organizations) ? organizations.length : '非数组')
    
    // 确保organizations是数组类型
    if (!Array.isArray(organizations)) {
      console.warn('接收到非数组数据，转换为空数组')
      organizations = []
    }
    
    // 同步保存后再返回结果
    const result = saveConnections(organizations)
    console.log('保存结果:', result)
    
    // 无论结果如何，都重新读取一次确保数据一致性
    if (result) {
      setTimeout(() => {
        console.log('保存后重新加载配置校验')
        loadConnections()
      }, 100)
    }
    
    return result
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
