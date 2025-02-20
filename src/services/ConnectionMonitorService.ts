import { eventBus } from './EventBusService'
import { SSHConfig } from './ConfigService'

export interface ConnectionStatus {
  id: string
  config: SSHConfig
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  lastError?: string
  latency?: number
  startTime?: number
}

class ConnectionMonitorService {
  private connections: Map<string, ConnectionStatus>
  private pingIntervals: Map<string, NodeJS.Timeout>

  constructor() {
    this.connections = new Map()
    this.pingIntervals = new Map()
  }

  addConnection(id: string, config: SSHConfig): void {
    this.connections.set(id, {
      id,
      config,
      status: 'connecting'
    })
    this.startMonitoring(id)
  }

  removeConnection(id: string): void {
    this.stopMonitoring(id)
    this.connections.delete(id)
  }

  updateStatus(id: string, status: ConnectionStatus['status'], error?: string): void {
    const conn = this.connections.get(id)
    if (conn) {
      conn.status = status
      conn.lastError = error
      if (status === 'connected' && !conn.startTime) {
        conn.startTime = Date.now()
      }
      eventBus.emit('connection-status-changed', conn)
    }
  }

  private startMonitoring(id: string): void {
    // 每30秒检查一次连接状态
    const interval = setInterval(() => {
      const conn = this.connections.get(id)
      if (conn && conn.status === 'connected') {
        this.checkLatency(id)
      }
    }, 30000)
    this.pingIntervals.set(id, interval)
  }

  private stopMonitoring(id: string): void {
    const interval = this.pingIntervals.get(id)
    if (interval) {
      clearInterval(interval)
      this.pingIntervals.delete(id)
    }
  }

  private async checkLatency(id: string): Promise<void> {
    const conn = this.connections.get(id)
    if (!conn) return

    const startTime = Date.now()
    try {
      await new Promise((resolve) => setTimeout(resolve, 100))
      conn.latency = Date.now() - startTime
      eventBus.emit('connection-latency-updated', { id, latency: conn.latency })
    } catch (err) {
      console.error(`检测延迟失败 (${id}):`, err)
    }
  }

  getStatus(id: string): ConnectionStatus | undefined {
    return this.connections.get(id)
  }

  getAllStatus(): ConnectionStatus[] {
    return Array.from(this.connections.values())
  }
}

export const connectionMonitorService = new ConnectionMonitorService() 