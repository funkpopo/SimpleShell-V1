<template>
  <div class="terminal-container" ref="terminalRef">
    <div class="terminal-toolbar" v-if="connected">
      <a-button-group size="small">
        <a-button @click="clearTerminal">
          <template #icon><icon-delete /></template>
          清空
        </a-button>
        <a-button @click="reconnect">
          <template #icon><icon-refresh /></template>
          重连
        </a-button>
      </a-button-group>
    </div>
    <div class="terminal-content" ref="terminalContent"></div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { Client } from 'ssh2'
import 'xterm/css/xterm.css'
import type { SSHConfig } from '@/services/ConfigService'
import { terminalSettingsService, TerminalSettings } from '@/services/TerminalSettingsService'
import { connectionHistoryService } from '@/services/ConnectionHistoryService'
import { eventBus } from '@/services/EventBusService'

export default defineComponent({
  name: 'SshTerminal',
  props: {
    config: {
      type: Object as PropType<SSHConfig>,
      required: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  emits: ['status-change'],
  setup(props, { emit }) {
    const terminalRef = ref<HTMLElement>()
    const terminalContent = ref<HTMLElement>()
    let terminal: Terminal | null = null
    let ssh: Client | null = null
    let fitAddon: FitAddon | null = null
    const connected = ref(false)
    let connectionStartTime = 0
    let currentRecordId = ''
    const settings = ref<TerminalSettings>(terminalSettingsService.getSettings())

    const initTerminal = () => {
      if (!terminalContent.value) return

      terminal = new Terminal({
        ...settings.value
      })

      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.open(terminalContent.value)
      fitAddon.fit()
    }

    const connect = async () => {
      if (!terminal) return
      
      try {
        emit('status-change', 'connecting')
        connectionStartTime = Date.now()
        
        ssh = new Client()
        
        ssh.on('ready', () => {
          if (!terminal) return
          
          ssh!.shell((err, stream) => {
            if (err) throw err

            connected.value = true
            emit('status-change', 'connected')
            currentRecordId = Date.now().toString()
            connectionHistoryService.addRecord(props.config, 'success')

            stream.on('data', (data) => {
              terminal!.write(data.toString())
            })

            stream.on('close', () => {
              connected.value = false
              emit('status-change', 'disconnected')
            })

            terminal.onData((data) => {
              stream.write(data)
            })
          })
        })

        ssh.on('error', (err) => {
          console.error('SSH连接错误:', err)
          connected.value = false
          emit('status-change', 'error')
          connectionHistoryService.addRecord(props.config, 'failed', err.message)
        })

        ssh.connect({
          host: props.config.host,
          port: props.config.port || 22,
          username: props.config.username,
          password: props.config.password,
          privateKey: props.config.privateKey,
          readyTimeout: 20000,
          keepaliveInterval: 10000
        })
      } catch (err) {
        console.error('连接失败:', err)
        emit('status-change', 'error')
        connectionHistoryService.addRecord(props.config, 'failed', err.message)
      }
    }

    const disconnect = () => {
      if (ssh) {
        ssh.end()
        ssh = null
      }
      connected.value = false
      if (currentRecordId) {
        const duration = Math.floor((Date.now() - connectionStartTime) / 1000)
        connectionHistoryService.updateDuration(currentRecordId, duration)
        currentRecordId = ''
      }
    }

    const reconnect = () => {
      disconnect()
      connect()
    }

    const clearTerminal = () => {
      terminal?.clear()
    }

    // 窗口大小改变时自适应
    const handleResize = () => {
      fitAddon?.fit()
    }

    // 监听活动状态
    watch(() => props.active, (active) => {
      if (active) {
        setTimeout(() => {
          handleResize()
        }, 0)
      }
    })

    // 监听终端设置变化
    const handleSettingsChange = (newSettings: TerminalSettings) => {
      settings.value = newSettings
      if (terminal) {
        terminal.options.fontSize = newSettings.fontSize
        terminal.options.fontFamily = newSettings.fontFamily
        terminal.options.theme = newSettings.theme
        terminal.options.cursorBlink = newSettings.cursorBlink
        terminal.options.scrollback = newSettings.scrollback
        
        // 重新适配大小
        fitAddon?.fit()
      }
    }

    onMounted(() => {
      initTerminal()
      connect()
      window.addEventListener('resize', handleResize)
      eventBus.on('terminal-settings-changed', handleSettingsChange)
    })

    onUnmounted(() => {
      disconnect()
      terminal?.dispose()
      window.removeEventListener('resize', handleResize)
      eventBus.off('terminal-settings-changed', handleSettingsChange)
    })

    return {
      terminalRef,
      terminalContent,
      connected,
      clearTerminal,
      reconnect
    }
  }
})
</script>

<style scoped>
.terminal-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  padding: 8px;
}

.terminal-toolbar {
  margin-bottom: 8px;
}

.terminal-content {
  flex: 1;
  overflow: hidden;
}
</style> 