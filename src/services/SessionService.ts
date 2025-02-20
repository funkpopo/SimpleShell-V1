import type ElectronStore from 'electron-store'
import { SSHConfig } from './ConfigService'

export interface SessionData {
  id: string
  config: SSHConfig
  title: string
  createdAt: number
  lastActiveAt: number
}

class SessionService {
  private store: ElectronStore | null = null
  private initPromise: Promise<void> | null = null
  private sessions: SessionData[] = []

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
          name: 'sessions',
          defaults: {
            sessions: []
          }
        })

        // 初始化后立即加载会话
        this.sessions = (this.store.get('sessions') as SessionData[]) || []
      } catch (error) {
        console.error('Failed to initialize SessionService store:', error)
        // 出错时使用空数组
        this.sessions = []
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

  // 同步获取当前会话列表
  getCurrentSessions(): SessionData[] {
    return this.sessions
  }

  async saveSessions(sessions: SessionData[]): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      this.sessions = sessions
      ;(this.store as ElectronStore).set('sessions', sessions)
    } catch (error) {
      console.error('Error saving sessions:', error)
      // 即使存储失败也更新内存中的会话
      this.sessions = sessions
    }
  }

  async getSessions(): Promise<SessionData[]> {
    try {
      await this.ensureStoreInitialized()
      return (this.store as ElectronStore).get('sessions') as SessionData[]
    } catch (error) {
      console.error('Error getting sessions:', error)
      return this.sessions
    }
  }

  async clearSessions(): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      this.sessions = []
      ;(this.store as ElectronStore).set('sessions', [])
    } catch (error) {
      console.error('Error clearing sessions:', error)
      // 即使存储失败也清空内存中的会话
      this.sessions = []
    }
  }
}

export const sessionService = new SessionService() 