<template>
  <div class="terminal-view" ref="terminalContainer"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { SearchAddon } from '@xterm/addon-search'
import SSHManager from '../services/SSHManager'
import '@xterm/xterm/css/xterm.css'

const props = defineProps({
  connectionId: String
})

const terminalContainer = ref(null)
let terminal = null
let fitAddon = null
let searchAddon = null
let ssh = null
let shell = null

// 初始化终端
const initTerminal = () => {
  terminal = new Terminal({
    fontSize: 14,
    fontFamily: 'Consolas, "Courier New", monospace',
    theme: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      selection: 'rgba(255, 255, 255, 0.3)',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    }
  })

  // 添加插件
  fitAddon = new FitAddon()
  searchAddon = new SearchAddon()
  const webLinksAddon = new WebLinksAddon()

  terminal.loadAddon(fitAddon)
  terminal.loadAddon(searchAddon)
  terminal.loadAddon(webLinksAddon)

  terminal.open(terminalContainer.value)
  fitAddon.fit()

  // 处理用户输入
  terminal.onData(data => {
    if (shell) {
      shell.write(data)
    }
  })

  // 处理终端大小变化
  terminal.onResize(size => {
    if (shell) {
      shell.resize(size.cols, size.rows)
    }
  })
}

// 连接到SSH会话
const connectSSH = async () => {
  if (!props.connectionId) return

  try {
    const connection = SSHManager.connections.get(props.connectionId)
    if (!connection || !connection.client) return

    ssh = connection.client
    shell = await ssh.requestShell()

    shell.on('data', data => {
      terminal.write(data)
    })

    shell.on('close', () => {
      terminal.write('\r\n\x1b[1;31m会话已关闭\x1b[0m\r\n')
    })

    // 设置初始终端大小
    const size = terminal.cols && terminal.rows
      ? { cols: terminal.cols, rows: terminal.rows }
      : { cols: 80, rows: 24 }
    
    shell.resize(size.cols, size.rows)
  } catch (error) {
    console.error('SSH连接失败:', error)
    terminal.write('\r\n\x1b[1;31m连接失败: ' + error.message + '\x1b[0m\r\n')
  }
}

// 监听窗口大小变化
const handleResize = () => {
  if (fitAddon) {
    fitAddon.fit()
  }
}

// 监听连接ID变化
watch(() => props.connectionId, async (newId, oldId) => {
  if (oldId && shell) {
    shell.end()
    shell = null
  }
  if (newId) {
    await connectSSH()
  }
})

onMounted(() => {
  initTerminal()
  window.addEventListener('resize', handleResize)
  if (props.connectionId) {
    connectSSH()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (shell) {
    shell.end()
  }
  if (terminal) {
    terminal.dispose()
  }
})

// 暴露终端搜索方法
defineExpose({
  findNext: (term) => searchAddon.findNext(term),
  findPrevious: (term) => searchAddon.findPrevious(term)
})
</script>

<style scoped>
.terminal-view {
  width: 100%;
  height: 100%;
  padding: 8px;
}

:deep(.xterm) {
  padding: 8px;
}

:deep(.xterm-viewport) {
  background-color: var(--primary-bg) !important;
}
</style> 