import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send: (channel: string, data: any) => {
      ipcRenderer.send(channel, data)
    },
    on: (channel: string, func: Function) => {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    },
    invoke: (channel: string, data: any) => {
      return ipcRenderer.invoke(channel, data)
    }
  },
  store: {
    get: (key: string) => ipcRenderer.invoke('store:get', key),
    set: (key: string, val: any) => ipcRenderer.invoke('store:set', key, val),
    delete: (key: string) => ipcRenderer.invoke('store:delete', key)
  }
})

// 类型定义
declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send(channel: string, data: any): void
        on(channel: string, func: Function): void
        invoke(channel: string, data: any): Promise<any>
      }
      store: {
        get(key: string): Promise<any>
        set(key: string, val: any): Promise<void>
        delete(key: string): Promise<void>
      }
    }
  }
} 