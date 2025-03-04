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
  
  // 打开文件选择对话框
  openFileDialog: async (options?: { title?: string; buttonLabel?: string; defaultPath?: string }): Promise<any> => {
    return await ipcRenderer.invoke('open-file-dialog', options)
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
  
  // 终端数据监听
  onTerminalData: (callback: (data: any) => void): (() => void) => {
    // 为每个回调创建唯一标识符，用于调试
    const callbackId = Date.now().toString() + Math.floor(Math.random() * 1000);
    
    console.log(`准备注册终端数据监听器 ID: ${callbackId}`);
    
    const listener = (_: any, data: any) => {
      if (data && data.id) {
        // 验证终端ID格式
        if (typeof data.id === 'string' && data.id.startsWith('term_')) {
          console.log(`监听器[${callbackId}]收到终端[${data.id}]数据`);
          
          // 调用回调前检查数据完整性
          if (data.data && typeof data.data === 'string') {
            callback(data);
          } else {
            console.error(`监听器[${callbackId}]收到的终端[${data.id}]数据无效:`, typeof data.data);
          }
        } else {
          console.warn(`监听器[${callbackId}]收到非标准格式的终端ID[${data.id}]`);
          callback(data); // 仍然传递数据以兼容旧格式
        }
      } else {
        console.error(`监听器[${callbackId}]收到无效的终端数据:`, data);
      }
    };
    
    ipcRenderer.on('terminal:data', listener);
    console.log(`已注册终端数据监听器: ${callbackId}`);
    
    return () => {
      console.log(`准备移除终端数据监听器: ${callbackId}`);
      ipcRenderer.removeListener('terminal:data', listener);
      console.log(`已移除终端数据监听器: ${callbackId}`);
    };
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
