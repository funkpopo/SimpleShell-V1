import { Client, ClientChannel } from 'ssh2'
import { ipcRenderer } from 'electron'

interface ConnectionInfo {
  name: string
  host: string
  port: number
  username: string
  authType: 'password' | 'privateKey'
  password?: string
  privateKeyPath?: string
  passphrase?: string
}

interface SSHConnection {
  client: Client
  stream?: ClientChannel
}

export class SSHManager {
  private connections: Map<string, SSHConnection> = new Map()
  private client: Client

  constructor() {
    this.client = new Client()
  }

  async connect(connection: ConnectionInfo): Promise<void> {
    try {
      const result = await ipcRenderer.invoke('ssh-connect', connection)
      if (!result.success) {
        throw new Error(result.error)
      }
    } catch (error) {
      throw error
    }
  }

  disconnect(name?: string): void {
    ipcRenderer.send('ssh-disconnect', name)
  }

  write(name: string, data: string): void {
    ipcRenderer.send('ssh-write', { name, data })
  }

  resize(name: string, size: { cols: number, rows: number }): void {
    ipcRenderer.send('ssh-resize', { name, size })
  }

  async selectPrivateKey(): Promise<string> {
    const result = await ipcRenderer.invoke('select-private-key')
    if (!result.success) {
      throw new Error(result.error)
    }
    return result.filePath
  }
}

export const sshManager = new SSHManager() 