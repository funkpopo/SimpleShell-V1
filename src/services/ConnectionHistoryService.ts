import type ElectronStore from 'electron-store'
import { SSHConfig } from './ConfigService'

export interface ConnectionRecord {
  id: string
  configId: string
  timestamp: number
  duration: number
  status: 'success' | 'failed'
  error?: string
}

class ConnectionHistoryService {
  private store: ElectronStore | null = null
  private initPromise: Promise<void> | null = null
  private records: ConnectionRecord[] = []

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
          name: 'connection-history',
          defaults: {
            records: []
          }
        })

        // 初始化后立即加载记录
        this.records = (this.store.get('records') as ConnectionRecord[]) || []
      } catch (error) {
        console.error('Failed to initialize ConnectionHistoryService store:', error)
        // 出错时使用空数组
        this.records = []
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

  // 同步获取当前记录
  getCurrentRecords(): ConnectionRecord[] {
    return this.records
  }

  async getRecords(): Promise<ConnectionRecord[]> {
    try {
      await this.ensureStoreInitialized()
      return (this.store as ElectronStore).get('records') as ConnectionRecord[]
    } catch (error) {
      console.error('Error getting records:', error)
      return this.records
    }
  }

  async addRecord(config: SSHConfig, status: 'success' | 'failed', error?: string): Promise<void> {
    const record: ConnectionRecord = {
      id: Date.now().toString(),
      configId: config.id,
      timestamp: Date.now(),
      duration: 0,
      status,
      error
    }
    
    try {
      await this.ensureStoreInitialized()
      this.records.unshift(record)
      // 只保留最近100条记录
      if (this.records.length > 100) {
        this.records.pop()
      }
      ;(this.store as ElectronStore).set('records', this.records)
    } catch (error) {
      console.error('Error adding record:', error)
      // 即使存储失败也更新内存中的记录
      this.records.unshift(record)
      if (this.records.length > 100) {
        this.records.pop()
      }
    }
  }

  async updateDuration(recordId: string, duration: number): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      const record = this.records.find(r => r.id === recordId)
      if (record) {
        record.duration = duration
        ;(this.store as ElectronStore).set('records', this.records)
      }
    } catch (error) {
      console.error('Error updating duration:', error)
      // 即使存储失败也更新内存中的记录
      const record = this.records.find(r => r.id === recordId)
      if (record) {
        record.duration = duration
      }
    }
  }

  async getRecordsByConfig(configId: string): Promise<ConnectionRecord[]> {
    return this.records.filter(r => r.configId === configId)
  }

  async clearRecords(): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      this.records = []
      ;(this.store as ElectronStore).set('records', [])
    } catch (error) {
      console.error('Error clearing records:', error)
      // 即使存储失败也清空内存中的记录
      this.records = []
    }
  }
}

export const connectionHistoryService = new ConnectionHistoryService() 