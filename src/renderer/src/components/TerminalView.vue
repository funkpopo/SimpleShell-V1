<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watchEffect, nextTick, computed } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

// 添加类型断言，临时解决类型问题
const api = (window as any).api;

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

// 终端状态
const status = ref<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected')
const errorMessage = ref('')
const terminal = ref<Terminal | null>(null)
const fitAddon = ref<FitAddon | null>(null)
const terminalElement = ref<HTMLElement | null>(null)
const terminalWrapper = ref<HTMLElement | null>(null)
const connectionId = ref<string | null>(null)
const shellId = ref<string | null>(null)
const isLocalTerminal = ref(false)
const terminalId = ref<string | null>(null)
const resizeObserver = ref<ResizeObserver | null>(null)

// 从props接收连接信息和主题状态
const props = defineProps<{
  connection?: Connection | null
  isDarkTheme: boolean
  isLocalMode?: boolean // 是否为本地终端模式
}>()

// 终端主题设置
const darkTheme = {
  background: '#1a1a1a',
  foreground: '#f0f0f0',
  cursor: '#fff',
  cursorAccent: '#000',
  selection: 'rgba(255, 255, 255, 0.3)',
  black: '#000000',
  red: '#ce352c',
  green: '#00B34A',
  yellow: '#f9b343',
  blue: '#1565c0',
  magenta: '#9c27b0',
  cyan: '#00bcd4',
  white: '#e7eaed'
}

const lightTheme = {
  background: '#ffffff',
  foreground: '#333333',
  cursor: '#333',
  cursorAccent: '#fff',
  selection: 'rgba(0, 0, 0, 0.3)',
  black: '#000000',
  red: '#e53935',
  green: '#43a047',
  yellow: '#fdd835',
  blue: '#2468bc',
  magenta: '#8e24aa',
  cyan: '#00acc1',
  white: '#bdbdbd'
}

// 根据主题选择终端主题
const currentTheme = computed(() => {
  return props.isDarkTheme ? darkTheme : lightTheme
})

// 初始化终端
const initializeTerminal = () => {
  if (terminal.value) {
    // 已存在终端实例，先销毁
    disposeTerminal()
  }

  terminal.value = new Terminal({
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    cursorBlink: true,
    theme: currentTheme.value,
    scrollback: 5000,
    fastScrollModifier: 'alt',
    convertEol: true,
    allowTransparency: true,
    disableStdin: false
  })

  // 添加插件
  fitAddon.value = new FitAddon()
  terminal.value.loadAddon(fitAddon.value)
  terminal.value.loadAddon(new WebLinksAddon())

  // 在DOM挂载后打开终端
  nextTick(() => {
    if (terminal.value && terminalElement.value) {
      terminal.value.open(terminalElement.value)
      fitAddon.value?.fit()
      
      // 设置ResizeObserver监控终端容器大小变化
      setupResizeObserver()
      
      // 连接到终端
      if (props.isLocalMode) {
        connectToLocalTerminal()
      } else if (props.connection) {
        connectToSSH(props.connection)
      }
    }
  })
}

// 设置ResizeObserver来监控终端容器大小变化
const setupResizeObserver = () => {
  // 先清理之前的observer
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
  }
  
  // 创建新的ResizeObserver
  resizeObserver.value = new ResizeObserver((entries) => {
    for (const entry of entries) {
      // 当容器大小变化时调整终端大小
      if (terminal.value && fitAddon.value) {
        fitAddon.value.fit()
        
        // 手动调整xterm-screen的宽度为100%
        const xtermScreen = terminalElement.value?.querySelector('.xterm-screen') as HTMLElement
        if (xtermScreen) {
          xtermScreen.style.width = '100%'
        }
        
        // 如果已连接，通知后端调整终端大小
        handleResize()
      }
    }
  })
  
  // 开始监控终端容器
  if (terminalWrapper.value) {
    resizeObserver.value.observe(terminalWrapper.value)
  }
}

// 销毁终端
const disposeTerminal = () => {
  if (terminal.value) {
    // 如果已连接，则断开连接
    disconnectTerminal()
    
    // 销毁终端
    terminal.value.dispose()
    terminal.value = null
    fitAddon.value = null
  }
}

// 连接到SSH服务器
const connectToSSH = async (connection: Connection) => {
  if (!terminal.value) return
  
  try {
    status.value = 'connecting'
    errorMessage.value = ''
    
    // 显示连接中信息
    terminal.value.write(`正在连接到 ${connection.name} (${connection.host}:${connection.port})...\r\n`)
    
    // 先建立SSH连接
    const connectResult = await api.sshConnect(connection)
    if (!connectResult.success) {
      throw new Error(connectResult.error || '连接失败')
    }
    
    connectionId.value = connectResult.id
    
    // 获取终端尺寸
    const cols = terminal.value.cols
    const rows = terminal.value.rows
    
    // 创建Shell会话
    const shellResult = await api.sshCreateShell({
      connectionId: connectionId.value,
      cols,
      rows
    })
    
    if (!shellResult.success) {
      throw new Error(shellResult.error || '创建Shell失败')
    }
    
    shellId.value = shellResult.shellId
    
    // 连接成功
    status.value = 'connected'
    
    // 设置终端输入监听
    terminal.value.onData((data) => {
      if (status.value === 'connected' && connectionId.value && shellId.value) {
        api.sshSendInput({
          connectionId: connectionId.value,
          shellId: shellId.value,
          data
        })
      }
    })
    
    // 设置终端大小调整监听
    window.addEventListener('resize', handleResize)
    
    // 监听Shell数据
    const dataUnsubscribe = api.onSshData((event) => {
      if (
        event.connectionId === connectionId.value &&
        event.shellId === shellId.value &&
        terminal.value
      ) {
        terminal.value.write(event.data)
      }
    })
    
    // 监听Shell关闭
    const closeUnsubscribe = api.onSshClose((event) => {
      if (
        event.connectionId === connectionId.value &&
        event.shellId === shellId.value
      ) {
        // Shell被关闭
        terminal.value?.writeln('\r\n\x1b[1;31m连接已关闭\x1b[0m')
        status.value = 'disconnected'
        shellId.value = null
        
        // 清理事件监听
        dataUnsubscribe()
        closeUnsubscribe()
      }
    })
  } catch (error: any) {
    console.error('SSH连接错误:', error)
    status.value = 'error'
    errorMessage.value = error.message || '连接失败'
    
    if (terminal.value) {
      terminal.value.writeln(`\r\n\x1b[1;31m错误: ${errorMessage.value}\x1b[0m`)
    }
  }
}

// 连接到本地终端
const connectToLocalTerminal = async () => {
  if (!terminal.value) return
  
  try {
    status.value = 'connecting'
    errorMessage.value = ''
    isLocalTerminal.value = true
    
    // 显示连接中信息
    terminal.value.write('正在启动本地终端...\r\n')
    
    // 获取终端尺寸
    const cols = terminal.value.cols
    const rows = terminal.value.rows
    
    // 创建本地终端
    const result = await api.createLocalTerminal({ cols, rows })
    
    if (!result.success) {
      throw new Error(result.error || '创建终端失败')
    }
    
    terminalId.value = result.id
    
    // 连接成功
    status.value = 'connected'
    
    // 设置终端输入监听
    terminal.value.onData((data) => {
      if (status.value === 'connected' && terminalId.value) {
        api.sendTerminalInput({
          id: terminalId.value,
          data
        })
      }
    })
    
    // 设置终端大小调整监听
    window.addEventListener('resize', handleResize)
    
    // 监听终端数据
    const dataUnsubscribe = api.onTerminalData((event) => {
      if (event.id === terminalId.value && terminal.value) {
        terminal.value.write(event.data)
      }
    })
    
    // 注册组件销毁时的清理函数
    onBeforeUnmount(() => {
      dataUnsubscribe()
      if (terminalId.value) {
        api.closeTerminal({ id: terminalId.value })
      }
    })
  } catch (error: any) {
    console.error('本地终端错误:', error)
    status.value = 'error'
    errorMessage.value = error.message || '启动终端失败'
    
    if (terminal.value) {
      terminal.value.writeln(`\r\n\x1b[1;31m错误: ${errorMessage.value}\x1b[0m`)
    }
  }
}

// 处理终端大小调整
const handleResize = () => {
  if (!terminal.value || !fitAddon.value) return
  
  // 获取新的尺寸
  fitAddon.value.fit()
  const cols = terminal.value.cols
  const rows = terminal.value.rows
  
  // 调整SSH终端大小
  if (status.value === 'connected') {
    if (isLocalTerminal.value && terminalId.value) {
      api.resizeTerminal({
        id: terminalId.value,
        cols,
        rows
      })
    } else if (connectionId.value && shellId.value) {
      api.sshResizeTerminal({
        connectionId: connectionId.value,
        shellId: shellId.value,
        cols,
        rows
      })
    }
  }
}

// 断开终端连接
const disconnectTerminal = () => {
  // 移除事件监听
  window.removeEventListener('resize', handleResize)
  
  // 清理ResizeObserver
  if (resizeObserver.value) {
    resizeObserver.value.disconnect()
    resizeObserver.value = null
  }
  
  // 断开SSH连接
  if (connectionId.value && shellId.value) {
    api.sshCloseShell({
      connectionId: connectionId.value,
      shellId: shellId.value
    })
    
    shellId.value = null
  }
  
  // 或者关闭本地终端
  if (isLocalTerminal.value && terminalId.value) {
    api.closeTerminal({ id: terminalId.value })
    terminalId.value = null
  }
  
  status.value = 'disconnected'
}

// 监听主题变化
watchEffect(() => {
  if (terminal.value) {
    terminal.value.options.theme = currentTheme.value
  }
})

// 组件挂载时初始化终端
onMounted(() => {
  initializeTerminal()
})

// 组件销毁前清理资源
onBeforeUnmount(() => {
  disconnectTerminal()
  disposeTerminal()
})
</script>

<template>
  <div class="terminal-container">
    <div class="terminal-header">
      <span v-if="props.connection" class="connection-info">
        {{ props.connection.name }} ({{ props.connection.username }}@{{ props.connection.host }}:{{ props.connection.port }})
      </span>
      <span v-else-if="props.isLocalMode" class="connection-info">
        本地终端
      </span>
      <span class="connection-status" :class="status">
        {{ 
          status === 'disconnected' ? '未连接' : 
          status === 'connecting' ? '连接中...' : 
          status === 'connected' ? '已连接' : 
          '连接错误'
        }}
      </span>
    </div>
    
    <div ref="terminalWrapper" class="terminal-wrapper">
      <div ref="terminalElement" class="terminal"></div>
    </div>
  </div>
</template>

<style scoped>
.terminal-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--terminal-bg);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.terminal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  user-select: none;
}

.connection-info {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.connection-status.disconnected {
  background-color: #9e9e9e;
  color: white;
}

.connection-status.connecting {
  background-color: #ffa726;
  color: white;
}

.connection-status.connected {
  background-color: #4caf50;
  color: white;
}

.connection-status.error {
  background-color: #f44336;
  color: white;
}

.terminal-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 4px;
  width: 100%;
  height: 100%;
}

.terminal {
  width: 100%;
  height: 100%;
}

/* 使用深度选择器修改xterm内部元素样式 */
:deep(.xterm) {
  padding: 0;
  width: 100%;
  height: 100%;
}

:deep(.xterm-screen) {
  width: 100% !important; /* 强制宽度100% */
}

:deep(.xterm-viewport) {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 6px;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background-color: rgba(128, 128, 128, 0.4);
  border-radius: 3px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(128, 128, 128, 0.7);
}

/* 主题变量 */
:root {
  --terminal-bg: #ffffff;
  --header-bg: #f5f5f5;
  --border-color: #e0e0e0;
  --text-primary: #333333;
}

:root .dark-theme {
  --terminal-bg: #1a1a1a;
  --header-bg: #272727;
  --border-color: #444444;
  --text-primary: #e0e0e0;
}
</style> 