import type ElectronStore from 'electron-store'
import { ITheme } from 'xterm'

export interface TerminalSettings {
  fontSize: number
  fontFamily: string
  theme: ITheme
  cursorBlink: boolean
  scrollback: number
  defaultShell: string
}

const defaultSettings: TerminalSettings = {
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  theme: {
    background: '#1e1e1e',
    foreground: '#ffffff',
    cursor: '#ffffff',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5'
  },
  cursorBlink: true,
  scrollback: 10000,
  defaultShell: 'powershell.exe'
}

class TerminalSettingsService {
  private store: ElectronStore | null = null
  private initPromise: Promise<void> | null = null
  private currentSettings: TerminalSettings = defaultSettings

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
          name: 'terminal-settings',
          defaults: {
            settings: defaultSettings
          }
        })
        
        // 初始化后立即加载设置
        this.currentSettings = (this.store.get('settings') as TerminalSettings) || defaultSettings
      } catch (error) {
        console.error('Failed to initialize TerminalSettingsService store:', error)
        // 出错时使用默认设置
        this.currentSettings = defaultSettings
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

  async getSettings(): Promise<TerminalSettings> {
    try {
      await this.ensureStoreInitialized()
      return (this.store as ElectronStore).get('settings') as TerminalSettings
    } catch (error) {
      console.error('Error getting settings:', error)
      return this.currentSettings
    }
  }

  async updateSettings(settings: Partial<TerminalSettings>): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      const newSettings = {
        ...this.currentSettings,
        ...settings
      }
      ;(this.store as ElectronStore).set('settings', newSettings)
      this.currentSettings = newSettings
    } catch (error) {
      console.error('Error updating settings:', error)
      // 即使存储失败也更新内存中的设置
      this.currentSettings = {
        ...this.currentSettings,
        ...settings
      }
    }
  }

  async resetSettings(): Promise<void> {
    try {
      await this.ensureStoreInitialized()
      ;(this.store as ElectronStore).set('settings', defaultSettings)
      this.currentSettings = defaultSettings
    } catch (error) {
      console.error('Error resetting settings:', error)
      this.currentSettings = defaultSettings
    }
  }

  // 同步获取当前设置，不需要等待存储初始化
  getCurrentSettings(): TerminalSettings {
    return this.currentSettings
  }
}

export const terminalSettingsService = new TerminalSettingsService() 