import { ConnectionStatus } from './ConnectionMonitorService'
import { TerminalSettings } from './TerminalSettingsService'

interface EventBusEvents {
  'connection-status-changed': ConnectionStatus;
  'connection-latency-updated': { id: string; latency: number };
  'terminal-settings-changed': TerminalSettings;
}

type EventHandler<T extends keyof EventBusEvents> = (payload: EventBusEvents[T]) => void;

class EventBus {
  private events: Map<keyof EventBusEvents, Function[]>

  constructor() {
    this.events = new Map()
  }

  on<T extends keyof EventBusEvents>(event: T, handler: EventHandler<T>): void {
    if (!this.events.has(event)) {
      this.events.set(event, [])
    }
    this.events.get(event)!.push(handler)
  }

  off<T extends keyof EventBusEvents>(event: T, handler: EventHandler<T>): void {
    if (!this.events.has(event)) return
    
    const handlers = this.events.get(event)!
    const index = handlers.indexOf(handler)
    if (index !== -1) {
      handlers.splice(index, 1)
    }
  }

  emit<T extends keyof EventBusEvents>(event: T, payload: EventBusEvents[T]): void {
    if (!this.events.has(event)) return
    
    this.events.get(event)!.forEach(handler => {
      try {
        handler(payload)
      } catch (err) {
        console.error(`Error in event handler for ${String(event)}:`, err)
      }
    })
  }

  clear(): void {
    this.events.clear()
  }

  toString(symbol: symbol): string {
    return String(symbol);
  }
}

export const eventBus = new EventBus()
export type { EventBusEvents } 