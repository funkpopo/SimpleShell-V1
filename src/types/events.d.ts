import { TerminalSettings } from '@/services/TerminalSettingsService'
import { ConnectionStatus } from '@/services/ConnectionMonitorService'

declare global {
  interface EventBusEvents {
    'terminal-settings-changed': (settings: TerminalSettings) => void
    'connection-status-changed': (status: ConnectionStatus) => void
    'connection-latency-updated': (id: string, latency: number) => void
  }
}

export {} 