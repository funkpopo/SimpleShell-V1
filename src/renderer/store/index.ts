import { defineStore } from 'pinia'

export const useTerminalStore = defineStore('terminal', {
  state: () => ({
    tabs: [],
    activeTab: null,
    connections: new Map()
  }),
  
  actions: {
    async addTab(config) {
      const id = Date.now()
      const tab = {
        id,
        title: config.name || `Terminal ${this.tabs.length + 1}`,
        config
      }
      
      this.tabs.push(tab)
      this.activeTab = id
      
      try {
        await window.electron.ipcRenderer.invoke('terminal:connect', {
          id,
          config
        })
        this.connections.set(id, config)
      } catch (error) {
        // 处理错误
        this.removeTab(id)
        throw error
      }
    },
    
    removeTab(id) {
      const index = this.tabs.findIndex(tab => tab.id === id)
      if (index > -1) {
        this.tabs.splice(index, 1)
        this.connections.delete(id)
        
        if (this.activeTab === id) {
          this.activeTab = this.tabs[Math.max(0, index - 1)]?.id
        }
        
        window.electron.ipcRenderer.invoke('terminal:disconnect', { id })
      }
    },
    
    setActiveTab(id) {
      this.activeTab = id
    }
  }
}) 