import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 IPC 通信接口给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 终端相关
  createTerminal: (options: any) => ipcRenderer.invoke('terminal-create', options),
  onTerminalData: (id: string, callback: (data: string) => void) => {
    ipcRenderer.on(`terminal-data-${id}`, (_event, data) => callback(data))
  },
  writeTerminal: (id: string, data: string) => {
    ipcRenderer.send('terminal-write', { id, data })
  },
  resizeTerminal: (id: string, cols: number, rows: number) => {
    ipcRenderer.send('terminal-resize', { id, cols, rows })
  },
  closeTerminal: (id: string) => {
    ipcRenderer.send('terminal-close', id)
  },
  
  // SSH相关
  connectSSH: (connection: any) => ipcRenderer.invoke('ssh-connect', connection),
  onSSHData: (id: string, callback: (data: string) => void) => {
    ipcRenderer.on(`ssh-data-${id}`, (_event, data) => callback(data))
  },
  writeSSH: (id: string, data: string) => {
    ipcRenderer.send('ssh-write', { id, data })
  },
  resizeSSH: (id: string, size: { cols: number, rows: number }) => {
    ipcRenderer.send('ssh-resize', { id, size })
  },
  disconnectSSH: (id: string) => {
    ipcRenderer.send('ssh-disconnect', id)
  }
}) 