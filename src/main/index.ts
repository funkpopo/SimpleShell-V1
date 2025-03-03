import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import { Client } from 'ssh2'
import * as pty from 'node-pty'

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

// 记录所有活动的SSH连接
const activeConnections = new Map()

// SSH会话管理
ipcMain.handle('ssh:connect', async (_, connectionInfo) => {
  try {
    console.log('收到SSH连接请求:', connectionInfo.name)
    
    const { id, host, port, username, password, privateKey } = connectionInfo
    
    // 检查是否已经有活动连接
    if (activeConnections.has(id)) {
      console.log('连接已存在，复用现有连接')
      return { success: true, id }
    }
    
    // 创建新的SSH连接
    const conn = new Client()
    
    // 返回一个Promise，等待连接完成或失败
    return new Promise((resolve, reject) => {
      const connectConfig: any = {
        host,
        port,
        username,
        readyTimeout: 10000, // 10秒超时
      }
      
      // 添加认证方式
      if (privateKey) {
        connectConfig.privateKey = privateKey
      } else if (password) {
        connectConfig.password = password
      }
      
      conn.on('ready', () => {
        console.log(`SSH连接 ${id} 已就绪`)
        
        // 存储连接对象
        activeConnections.set(id, {
          connection: conn,
          shells: new Map()
        })
        
        resolve({ success: true, id })
      })
      
      conn.on('error', (err) => {
        console.error(`SSH连接 ${id} 错误:`, err)
        reject({ success: false, error: err.message })
      })
      
      // 开始连接
      conn.connect(connectConfig)
    })
  } catch (error: any) {
    console.error('SSH连接失败:', error)
    return { success: false, error: error.message || '连接失败' }
  }
})

// 创建Shell会话
ipcMain.handle('ssh:shell', async (_, { connectionId, cols, rows }) => {
  try {
    const connInfo = activeConnections.get(connectionId)
    if (!connInfo) {
      return { success: false, error: '连接不存在' }
    }
    
    const shellId = Date.now().toString()
    
    return new Promise((resolve, reject) => {
      connInfo.connection.shell({ term: 'xterm-256color', cols, rows }, (err, stream) => {
        if (err) {
          console.error('创建Shell失败:', err)
          reject({ success: false, error: err.message })
          return
        }
        
        // 存储Shell流
        connInfo.shells.set(shellId, stream)
        
        // 设置数据接收事件
        stream.on('data', (data) => {
          const win = BrowserWindow.getFocusedWindow()
          if (win) {
            win.webContents.send('ssh:data', { connectionId, shellId, data: data.toString() })
          }
        })
        
        stream.on('close', () => {
          console.log(`Shell ${shellId} 关闭`)
          const win = BrowserWindow.getFocusedWindow()
          win?.webContents.send('ssh:close', { connectionId, shellId })
          connInfo.shells.delete(shellId)
        })
        
        resolve({ success: true, shellId })
      })
    })
  } catch (error: any) {
    console.error('创建Shell失败:', error)
    return { success: false, error: error.message || '创建Shell失败' }
  }
})

// SSH输入数据处理
ipcMain.on('ssh:input', (_, { connectionId, shellId, data }) => {
  try {
    const connInfo = activeConnections.get(connectionId)
    if (!connInfo) {
      console.error('连接不存在:', connectionId)
      return
    }
    
    const stream = connInfo.shells.get(shellId)
    if (!stream) {
      console.error('Shell不存在:', shellId)
      return
    }
    
    // 向SSH流写入数据
    stream.write(data)
  } catch (error) {
    console.error('发送数据失败:', error)
  }
})

// SSH调整窗口大小
ipcMain.on('ssh:resize', (_, { connectionId, shellId, cols, rows }) => {
  try {
    const connInfo = activeConnections.get(connectionId)
    if (!connInfo) return
    
    const stream = connInfo.shells.get(shellId)
    if (!stream) return
    
    // 调整终端大小
    stream.setWindow(rows, cols)
  } catch (error) {
    console.error('调整终端大小失败:', error)
  }
})

// 关闭Shell
ipcMain.on('ssh:close-shell', (_, { connectionId, shellId }) => {
  try {
    const connInfo = activeConnections.get(connectionId)
    if (!connInfo) return
    
    const stream = connInfo.shells.get(shellId)
    if (stream) {
      // 关闭流
      stream.end()
      connInfo.shells.delete(shellId)
    }
  } catch (error) {
    console.error('关闭Shell失败:', error)
  }
})

// 关闭连接
ipcMain.on('ssh:disconnect', (_, { connectionId }) => {
  try {
    const connInfo = activeConnections.get(connectionId)
    if (!connInfo) return
    
    // 关闭所有Shell
    for (const stream of connInfo.shells.values()) {
      stream.end()
    }
    
    // 关闭连接
    connInfo.connection.end()
    activeConnections.delete(connectionId)
    console.log(`SSH连接 ${connectionId} 已关闭`)
  } catch (error) {
    console.error('关闭连接失败:', error)
  }
})

//==============================
// 终端相关函数
//==============================

// 启动Windows Terminal（作为独立进程）
function launchWindowsTerminal() {
  if (process.platform === 'win32') {
    try {
      const { spawn } = require('child_process')
      // 尝试启动Windows Terminal
      spawn('wt.exe', [], {
        detached: true,
        stdio: 'ignore',
        shell: true
      }).unref()
      console.log('已启动Windows Terminal')
      return true
    } catch (error) {
      console.error('启动Windows Terminal失败:', error)
      return false
    }
  }
  return false
}

// 为存储本地终端进程添加映射
const localTerminals = new Map<string, {
  pty: any,
  dataCallback?: (data: { id: string; data: string }) => void
}>()

// 创建本地终端（集成到应用程序内）
async function createLocalTerminal(options: { cols: number; rows: number }): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { cols, rows } = options
    const id = Date.now().toString()
    
    // 确定要使用的Shell
    let shell: string
    let args: string[] = []
    
    // Windows特殊处理
    if (process.platform === 'win32') {
      shell = 'powershell.exe'
      // 检查用户是否想使用Windows Terminal而不是集成终端
      if (process.env.USE_EXTERNAL_TERMINAL === 'true') {
        if (launchWindowsTerminal()) {
          return { success: false, error: '已启动外部Windows Terminal' }
        }
      }
    } else {
      // Linux/Mac使用标准shell
      shell = process.env.SHELL || '/bin/bash'
      args = ['-l'] // 作为登录shell启动
    }
    
    console.log(`启动本地终端: ${shell}`)
    
    // 创建伪终端
    const terminalProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: cols || 80,
      rows: rows || 24,
      cwd: process.env.HOME || process.env.USERPROFILE,
      env: { ...process.env, TERM: 'xterm-256color' }
    })
    
    // 存储终端实例
    localTerminals.set(id, {
      pty: terminalProcess
    })
    
    console.log(`本地终端 ${id} 已创建`)
    
    return { success: true, id }
  } catch (error: any) {
    console.error('创建本地终端失败:', error)
    return { success: false, error: error.message || '创建终端失败' }
  }
}

// 向终端发送输入
function sendTerminalInput(options: { id: string; data: string }): void {
  const { id, data } = options
  
  if (localTerminals.has(id)) {
    const terminal = localTerminals.get(id)
    if (terminal && terminal.pty) {
      terminal.pty.write(data)
    }
  }
}

// 调整终端大小
function resizeTerminal(options: { id: string; cols: number; rows: number }): void {
  const { id, cols, rows } = options
  
  if (localTerminals.has(id)) {
    const terminal = localTerminals.get(id)
    if (terminal && terminal.pty) {
      try {
        terminal.pty.resize(cols, rows)
      } catch (error) {
        console.error('调整终端大小失败:', error)
      }
    }
  }
}

// 关闭终端
function closeTerminal(options: { id: string }): void {
  const { id } = options
  
  if (localTerminals.has(id)) {
    const terminal = localTerminals.get(id)
    if (terminal && terminal.pty) {
      try {
        terminal.pty.kill()
        console.log(`本地终端 ${id} 已关闭`)
      } catch (error) {
        console.error('关闭终端失败:', error)
      } finally {
        localTerminals.delete(id)
      }
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
  
  // 检查文件是否存在
  if (fs.existsSync(connectionsFilePath)) {
    console.log('配置文件已存在:', connectionsFilePath)
  } else {
    console.log('配置文件不存在，将创建空配置')
    // 创建空的配置文件
    saveConnections([])
  }
  
  // 设置IPC处理程序
  function setupIPCHandlers() {
    // 系统信息
    ipcMain.handle('get-system-info', async () => {
      return await getSystemInfo()
    })
    
    // 加载连接
    ipcMain.handle('load-connections', async () => {
      return loadConnections()
    })
    
    // 保存连接
    ipcMain.handle('save-connections', async (_event, organizations) => {
      try {
        saveConnections(organizations)
        return { success: true }
      } catch (error: any) {
        console.error('保存连接失败:', error)
        return { success: false, error: error.message || '保存失败' }
      }
    })
    
    // 启动Windows Terminal
    ipcMain.handle('launch-windows-terminal', async () => {
      return { success: launchWindowsTerminal() }
    })
  }
  
  setupIPCHandlers()

  // 本地终端IPC处理
  ipcMain.handle('terminal:create', async (_, options) => {
    console.log('收到创建本地终端请求')
    const result = await createLocalTerminal(options)
    
    if (result.success && result.id) {
      // 设置数据接收回调
      const terminalInfo = localTerminals.get(result.id)
      if (terminalInfo && terminalInfo.pty) {
        terminalInfo.pty.onData((data: string) => {
          const win = BrowserWindow.getFocusedWindow()
          if (win) {
            win.webContents.send('terminal:data', { id: result.id, data })
          }
        })
      }
    }
    
    return result
  })
  
  ipcMain.on('terminal:input', (_, options) => {
    sendTerminalInput(options)
  })
  
  ipcMain.on('terminal:resize', (_, options) => {
    resizeTerminal(options)
  })
  
  ipcMain.on('terminal:close', (_, options) => {
    closeTerminal(options)
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
