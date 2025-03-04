import { ElectronAPI } from '@electron-toolkit/preload'

interface SystemInfo {
  osInfo: {
    platform: string
    release: string
    arch: string
  }
  cpuInfo: {
    usage: number
    model: string
    cores: number
  }
  memoryInfo: {
    total: number
    free: number
    used: number
    usedPercentage: number
  }
}

interface SSHConnectResult {
  success: boolean
  id?: string
  error?: string
}

interface SSHShellResult {
  success: boolean
  shellId?: string
  error?: string
}

interface SSHDataEvent {
  connectionId: string
  shellId: string
  data: string
}

interface SSHCloseEvent {
  connectionId: string
  shellId: string
}

interface TerminalResult {
  success: boolean
  id?: string
  error?: string
}

interface TerminalDataEvent {
  id: string
  data: string
}

interface Connection {
  id: string
  name: string
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  description?: string
}

interface Organization {
  id: string
  name: string
  connections: Connection[]
}

interface API {
  getSystemInfo(): Promise<SystemInfo>
  loadConnections(): Promise<Organization[]>
  saveConnections(organizations: Organization[]): Promise<boolean>
  openFileDialog(options?: { title?: string; buttonLabel?: string; defaultPath?: string }): Promise<{
    canceled: boolean
    filePath?: string
    fileContent?: string
    error?: string
  }>
  sshConnect(connectionInfo: Connection): Promise<SSHConnectResult>
  sshCreateShell(params: { connectionId: string, cols: number, rows: number }): Promise<SSHShellResult>
  sshSendInput(params: { connectionId: string, shellId: string, data: string }): void
  sshResizeTerminal(params: { connectionId: string, shellId: string, cols: number, rows: number }): void
  sshCloseShell(params: { connectionId: string, shellId: string }): void
  sshDisconnect(params: { connectionId: string }): void
  createLocalTerminal(params: { cols: number, rows: number }): Promise<TerminalResult>
  sendTerminalInput(params: { id: string, data: string }): void
  resizeTerminal(params: { id: string, cols: number, rows: number }): void
  closeTerminal(params: { id: string }): void
  onSshData(callback: (data: SSHDataEvent) => void): () => void
  onSshClose(callback: (data: SSHCloseEvent) => void): () => void
  onTerminalData(callback: (data: TerminalDataEvent) => void): () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: API
  }
}
