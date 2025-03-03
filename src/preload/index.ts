import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 获取系统信息
  getSystemInfo: async (): Promise<any> => {
    return await ipcRenderer.invoke('get-system-info')
  },
  
  // 加载连接配置
  loadConnections: async (): Promise<any> => {
    return await ipcRenderer.invoke('load-connections')
  },
  
  // 保存连接配置
  saveConnections: async (organizations: any): Promise<boolean> => {
    return await ipcRenderer.invoke('save-connections', organizations)
  },
  
  // SSH连接相关
  sshConnect: async (connectionInfo: any): Promise<any> => {
    return await ipcRenderer.invoke('ssh:connect', connectionInfo)
  },
  
  // 创建SSH Shell
  sshCreateShell: async (params: { connectionId: string, cols: number, rows: number }): Promise<any> => {
    return await ipcRenderer.invoke('ssh:shell', params)
  },
  
  // 发送SSH输入
  sshSendInput: (params: { connectionId: string, shellId: string, data: string }): void => {
    ipcRenderer.send('ssh:input', params)
  },
  
  // 调整SSH终端大小
  sshResizeTerminal: (params: { connectionId: string, shellId: string, cols: number, rows: number }): void => {
    ipcRenderer.send('ssh:resize', params)
  },
  
  // 关闭SSH Shell
  sshCloseShell: (params: { connectionId: string, shellId: string }): void => {
    ipcRenderer.send('ssh:close-shell', params)
  },
  
  // 断开SSH连接
  sshDisconnect: (params: { connectionId: string }): void => {
    ipcRenderer.send('ssh:disconnect', params)
  },
  
  // 本地终端相关
  createLocalTerminal: async (params: { cols: number, rows: number }): Promise<any> => {
    return await ipcRenderer.invoke('terminal:create', params)
  },
  
  // 发送终端输入
  sendTerminalInput: (params: { id: string, data: string }): void => {
    ipcRenderer.send('terminal:input', params)
  },
  
  // 调整终端大小
  resizeTerminal: (params: { id: string, cols: number, rows: number }): void => {
    ipcRenderer.send('terminal:resize', params)
  },
  
  // 关闭终端
  closeTerminal: (params: { id: string }): void => {
    ipcRenderer.send('terminal:close', params)
  },
  
  // 事件监听
  onSshData: (callback: (data: any) => void): () => void => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('ssh:data', listener)
    return () => {
      ipcRenderer.removeListener('ssh:data', listener)
    }
  },
  
  onSshClose: (callback: (data: any) => void): () => void => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('ssh:close', listener)
    return () => {
      ipcRenderer.removeListener('ssh:close', listener)
    }
  },
  
  onTerminalData: (callback: (data: any) => void): () => void => {
    const listener = (_: any, data: any) => callback(data)
    ipcRenderer.on('terminal:data', listener)
    return () => {
      ipcRenderer.removeListener('terminal:data', listener)
    }
  },
  
  // 通用IPC调用方法
  invoke: async (channel: string, ...args: any[]): Promise<any> => {
    return await ipcRenderer.invoke(channel, ...args)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
