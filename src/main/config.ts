import { dialog, BrowserWindow } from 'electron'
import { writeFile, readFile } from 'fs/promises'
import { encrypt, decrypt } from './crypto'
import Store from 'electron-store'

interface ExportConfig {
  version: string
  timestamp: number
  connections: any[]
}

interface ErrorWithMessage {
  message: string
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  )
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError

  try {
    return new Error(JSON.stringify(maybeError))
  } catch {
    return new Error(String(maybeError))
  }
}

const store = new Store<{
  ssh: Record<string, any>
}>({
  name: 'ssh-config',
  encryptionKey: 'your-encryption-key'
}) as any

export async function exportConfig(mainWindow: BrowserWindow) {
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '导出配置',
      defaultPath: `ssh-config-${Date.now()}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })

    if (!filePath) return

    const configs = await store.get('ssh')
    
    const exportData: ExportConfig = {
      version: '1.0.0',
      timestamp: Date.now(),
      connections: Object.values(configs || {})
    }

    await writeFile(filePath, JSON.stringify(exportData, null, 2))
    return { success: true }
  } catch (error) {
    const errorWithMessage = toErrorWithMessage(error)
    return { success: false, error: errorWithMessage.message }
  }
}

export async function importConfig(mainWindow: BrowserWindow) {
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '导入配置',
      filters: [{ name: 'JSON', extensions: ['json'] }],
      properties: ['openFile']
    })

    if (!filePaths.length) return

    const content = await readFile(filePaths[0], 'utf-8')
    const importData: ExportConfig = JSON.parse(content)

    if (!importData.version.startsWith('1.')) {
      throw new Error('不支持的配置文件版本')
    }

    for (const config of importData.connections) {
      await store.set(`ssh.${config.id}`, {
        ...config,
        password: encrypt(decrypt(config.password))
      })
    }

    return { success: true }
  } catch (error) {
    const errorWithMessage = toErrorWithMessage(error)
    return { success: false, error: errorWithMessage.message }
  }
} 