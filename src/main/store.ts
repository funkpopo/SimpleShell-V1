import type { BrowserWindow } from 'electron'
import { ipcMain } from 'electron'
import { encrypt, decrypt } from './crypto'

interface SSHConfig {
  id: string
  name: string
  host: string
  port: number
  username: string
  password: string
}

let store: any = null

export async function setupStore(mainWindow: BrowserWindow) {
  const { default: Store } = await import('electron-store')
  store = new Store({
    name: 'ssh-config',
    encryptionKey: 'your-encryption-key'
  })

  // 保存SSH配置
  ipcMain.handle('store:save-ssh', async (event, config: SSHConfig) => {
    try {
      const encryptedConfig = {
        ...config,
        password: encrypt(config.password)
      }
      await store.set(`ssh.${config.id}`, encryptedConfig)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })

  // 获取SSH配置
  ipcMain.handle('store:get-ssh', async (event, id: string) => {
    try {
      const config = await store.get(`ssh.${id}`)
      if (!config) return null
      
      return {
        ...config,
        password: decrypt(config.password)
      }
    } catch (error) {
      return null
    }
  })

  // 获取所有SSH配置
  ipcMain.handle('store:get-all-ssh', async () => {
    try {
      const configs = await store.get('ssh')
      return Object.values(configs).map(config => ({
        ...config,
        password: decrypt(config.password)
      }))
    } catch (error) {
      return []
    }
  })

  // 删除SSH配置
  ipcMain.handle('store:delete-ssh', async (event, id: string) => {
    try {
      await store.delete(`ssh.${id}`)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  })
}

export function getStore() {
  return store
} 