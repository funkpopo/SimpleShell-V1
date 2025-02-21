declare interface Window {
  electron: {
    ipcRenderer: {
      send(channel: string, data: any): void
      on(channel: string, func: Function): void
      invoke(channel: string, data: any): Promise<any>
      removeListener(channel: string, func: Function): void
    }
    store: {
      get(key: string): Promise<any>
      set(key: string, val: any): Promise<void>
      delete(key: string): Promise<void>
    }
  }
} 