import { v4 as uuidv4 } from 'uuid'
import type ElectronStore from 'electron-store'

export interface SSHConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
  privateKey?: string
}

class ConfigService {
  private store: ElectronStore | null = null
  private initPromise: Promise<void> | null = null
  private connections: SSHConfig[] = []

  constructor() {
    // 移除直接初始化
  }

  private async initStore() {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = (async () => {
      try {
        const Store = (await import('electron-store')).default
        if (typeof Store !== 'function') {
          throw new Error('Store is not a constructor')
        }

        this.store = new Store({
          name: 'config',
          defaults: {
            connections: []
          }
        })

        // 初始化后立即加载连接
        this.connections = (this.store.get('connections') as SSHConfig[]) || []
      } catch (error) {
        console.error('Failed to initialize ConfigService store:', error)
        // 出错时使用空数组
        this.connections = []
        throw error
      }
    })()

    return this.initPromise
  }

  private async ensureStoreInitialized() {
    if (!this.store) {
      await this.initStore()
    }
    if (!this.store) {
      throw new Error('Store initialization failed')
    }
  }

  // 同步获取当前连接列表
  getConnections(): SSHConfig[] {
    return this.connections
  }

  async getAllConnections(): Promise<SSHConfig[]> {
    try {
      await this.ensureStoreInitialized()
      return (this.store as ElectronStore).get('connections') as SSHConfig[]
    } catch (error) {
      console.error('Error getting connections:', error)
      return this.connections
    }
  }

  async addConnection(config: Omit<SSHConfig, 'id'>): Promise<SSHConfig> {
    const newConfig = {
      ...config,
      id: uuidv4()
    }
    
    try {
      await this.ensureStoreInitialized()
      this.connections.push(newConfig)
      ;(this.store as ElectronStore).set('connections', this.connections)
    } catch (error) {
      console.error('Error adding connection:', error)
      // 即使存储失败也更新内存中的连接
      this.connections.push(newConfig)
    }
    
    return newConfig
  }

  async updateConnection(config: SSHConfig): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      const index = this.connections.findIndex(c => c.id === config.id)
      if (index !== -1) {
        this.connections[index] = config
        ;(this.store as ElectronStore).set('connections', this.connections)
      }
    } catch (error) {
      console.error('Error updating connection:', error)
      // 即使存储失败也更新内存中的连接
      const index = this.connections.findIndex(c => c.id === config.id)
      if (index !== -1) {
        this.connections[index] = config
      }
    }
  }

  async deleteConnection(id: string): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      this.connections = this.connections.filter(c => c.id !== id)
      ;(this.store as ElectronStore).set('connections', this.connections)
    } catch (error) {
      console.error('Error deleting connection:', error)
      // 即使存储失败也更新内存中的连接
      this.connections = this.connections.filter(c => c.id !== id)
    }
  }

  async exportConfigs(): Promise<string> {
    await this.ensureStoreInitialized()
    const connections = await this.getAllConnections()
    return JSON.stringify(connections, null, 2)
  }

  async importConfigs(jsonStr: string): Promise<void> {
    await this.ensureStoreInitialized()
    try {
      const configs = JSON.parse(jsonStr) as SSHConfig[]
      // 验证导入的配置
      if (!Array.isArray(configs)) {
        throw new Error('Invalid config format')
      }
      
      configs.forEach(config => {
        if (!config.id || !config.name || !config.host || !config.username) {
          throw new Error('Invalid config data')
        }
      })

      ;(this.store as ElectronStore).set('connections', configs)
    } catch (err: unknown) {
      console.error('Error:', err as Error)
      throw new Error('导入配置失败: ' + (err as Error).message)
    }
  }

  // 导出为文件
  async exportToFile(filePath: string): Promise<void> {
    const fs = window.require('fs').promises
    const data = await this.exportConfigs()
    await fs.writeFile(filePath, data, 'utf-8')
  }

  // 从文件导入
  async importFromFile(filePath: string): Promise<void> {
    const fs = window.require('fs').promises
    const data = await fs.readFile(filePath, 'utf-8')
    await this.importConfigs(data)
  }
}

export const configService = new ConfigService() 