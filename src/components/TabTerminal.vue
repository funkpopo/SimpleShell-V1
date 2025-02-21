<template>
  <div class="terminal-tabs">
    <el-tabs
      v-model="activeTab"
      type="card"
      closable
      @tab-remove="removeTab"
      @tab-click="switchTab"
    >
      <el-tab-pane
        v-for="item in tabs"
        :key="item.name"
        :label="item.title"
        :name="item.name"
      >
        <div class="terminal-wrapper" :id="'terminal-' + item.name">
          <div v-if="item.error" class="terminal-error">
            <el-alert
              :title="item.error"
              type="error"
              show-icon
              @close="clearError(item)"
            >
              <template #default>
                <el-button type="primary" size="small" @click="reconnect(item)">
                  重新连接
                </el-button>
              </template>
            </el-alert>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onBeforeUnmount } from '@vue/runtime-core'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import * as pty from 'node-pty'
import { ElMessage } from 'element-plus'
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

interface TerminalTab {
  name: string
  title: string
  terminal?: Terminal
  fitAddon?: FitAddon
  connection?: ConnectionInfo
  ptyProcess?: pty.IPty
  error?: string
}

// 添加类型定义
declare global {
  interface Window {
    electronAPI: {
      createTerminal: (options: any) => Promise<{ success: boolean; error?: string }>
      onTerminalData: (id: string, callback: (data: string) => void) => void
      writeTerminal: (id: string, data: string) => void
      resizeTerminal: (id: string, cols: number, rows: number) => void
      closeTerminal: (id: string) => void
      connectSSH: (connection: ConnectionInfo) => Promise<{ success: boolean; error?: string }>
      onSSHData: (id: string, callback: (data: string) => void) => void
      writeSSH: (id: string, data: string) => void
      resizeSSH: (id: string, size: { cols: number, rows: number }) => void
      disconnectSSH: (id: string) => void
    }
  }
}

export default defineComponent({
  name: 'TabTerminal',
  setup() {
    const tabs = ref<TerminalTab[]>([])
    const activeTab = ref('')
    let tabIndex = 0

    const clearError = (tab: TerminalTab) => {
      tab.error = undefined
    }

    const reconnect = async (tab: TerminalTab) => {
      if (tab.connection) {
        await initConnection(tab, tab.connection)
      }
    }

    const initPtyProcess = async (tab: TerminalTab) => {
      try {
        const result = await window.electronAPI.createTerminal({
          id: tab.name,
          cols: tab.terminal?.cols,
          rows: tab.terminal?.rows
        })

        if (!result.success) {
          throw new Error(result.error)
        }

        window.electronAPI.onTerminalData(tab.name, (data: string) => {
          tab.terminal?.write(data)
        })

        tab.terminal?.onData((data: string) => {
          window.electronAPI.writeTerminal(tab.name, data)
        })

        tab.terminal?.onResize((size: { cols: number, rows: number }) => {
          window.electronAPI.resizeTerminal(tab.name, size.cols, size.rows)
        })

        return true
      } catch (error) {
        console.error('Failed to create terminal:', error)
        return false
      }
    }

    const initConnection = async (tab: TerminalTab, connection: ConnectionInfo) => {
      try {
        if (connection.host === 'localhost') {
          // 本地终端
          const success = await initPtyProcess(tab)
          if (success) {
            tab.terminal?.writeln('本地终端已连接')
          } else {
            throw new Error('Failed to create local terminal')
          }
        } else {
          // SSH连接
          const result = await window.electronAPI.connectSSH(connection)
          
          if (result.success) {
            tab.terminal?.writeln(`已连接到 ${connection.host}`)
            
            // 绑定SSH数据传输
            window.electronAPI.onSSHData(tab.name, (data: string) => {
              tab.terminal?.write(data)
            })
            
            // 绑定终端输入
            tab.terminal?.onData((data: string) => {
              window.electronAPI.writeSSH(tab.name, data)
            })

            // 绑定终端大小变化
            tab.terminal?.onResize((size: { cols: number, rows: number }) => {
              window.electronAPI.resizeSSH(tab.name, size)
            })
          } else {
            throw new Error(result.error)
          }
        }
      } catch (err) {
        const error = err as Error
        tab.error = `连接失败: ${error.message}`
        ElMessage.error(`连接到 ${connection.host} 失败: ${error.message}`)
      }
    }

    const initTerminal = (name: string, connection?: ConnectionInfo) => {
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff'
        },
        allowTransparency: true
      })
      
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())
      
      setTimeout(async () => {
        const element = document.getElementById(`terminal-${name}`)
        if (element) {
          terminal.open(element)
          fitAddon.fit()
          
          if (connection) {
            terminal.writeln(`正在连接到 ${connection.host}...`)
            const tab = tabs.value.find(t => t.name === name)
            if (tab) {
              await initConnection(tab, connection)
            }
          } else {
            const tab = tabs.value.find(t => t.name === name)
            if (tab) {
              initPtyProcess(tab)
            }
            terminal.writeln('本地终端已准备就绪')
          }
        }
      }, 0)
      
      return { terminal, fitAddon }
    }

    const addNewTab = (connection?: ConnectionInfo) => {
      const name = `terminal-${tabIndex++}`
      const tab: TerminalTab = {
        name,
        title: connection ? connection.name : `终端 ${tabIndex}`,
        connection
      }
      
      tabs.value.push(tab)
      activeTab.value = name
      
      setTimeout(() => {
        const { terminal, fitAddon } = initTerminal(name, connection)
        tab.terminal = terminal
        tab.fitAddon = fitAddon

        // 处理终端resize
        terminal.onResize(size => {
          if (tab.ptyProcess) {
            tab.ptyProcess.resize(size.cols, size.rows)
          }
          // 对于SSH连接，发送resize事件
          if (tab.connection && tab.connection.host !== 'localhost') {
            ipcRenderer.send(`ssh-resize-${tab.name}`, size)
          }
        })
      }, 0)
    }

    const removeTab = (targetName: string) => {
      const tab = tabs.value.find((tab: TerminalTab) => tab.name === targetName)
      if (tab) {
        // 清理资源
        if (tab.terminal) {
          tab.terminal.dispose()
        }
        if (tab.connection?.host === 'localhost') {
          window.electronAPI.closeTerminal(tab.name)
        } else if (tab.connection) {
          window.electronAPI.disconnectSSH(tab.name)
        }
      }
      
      tabs.value = tabs.value.filter((tab: TerminalTab) => tab.name !== targetName)
      if (activeTab.value === targetName) {
        activeTab.value = tabs.value[tabs.value.length - 1]?.name || ''
      }
    }

    const switchTab = () => {
      const tab = tabs.value.find((tab: TerminalTab) => tab.name === activeTab.value)
      if (tab?.fitAddon) {
        setTimeout(() => {
          tab.fitAddon?.fit()
        }, 0)
      }
    }

    const handleConnection = (connection: ConnectionInfo) => {
      addNewTab(connection)
    }

    onMounted(() => {
      addNewTab()
      window.addEventListener('resize', () => {
        const tab = tabs.value.find((tab: TerminalTab) => tab.name === activeTab.value)
        if (tab?.fitAddon) {
          tab.fitAddon.fit()
        }
      })
    })

    onBeforeUnmount(() => {
      tabs.value.forEach(tab => {
        if (tab.terminal) {
          tab.terminal.dispose()
        }
        window.electronAPI.closeTerminal(tab.name)
      })
    })

    return {
      tabs,
      activeTab,
      addNewTab,
      removeTab,
      switchTab,
      handleConnection,
      clearError,
      reconnect
    }
  }
})
</script>

<style lang="scss" scoped>
.terminal-tabs {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  :deep(.el-tabs) {
    flex: 1;
    display: flex;
    flex-direction: column;
    background-color: #1e1e1e;
    height: 100%;
    
    .el-tabs__header {
      margin: 0;
      padding: 0;
      border-bottom: 1px solid #333;
      background-color: #2d2d2d;
      order: -1;
    }
    
    .el-tabs__content {
      flex: 1;
      padding: 0;
      height: calc(100% - 40px);
      overflow: hidden;
    }
    
    .el-tab-pane {
      height: 100%;
    }
  }
  
  .terminal-wrapper {
    height: 100%;
    padding: 10px;
    position: relative;
    
    .terminal-error {
      position: absolute;
      top: 10px;
      left: 10px;
      right: 10px;
      z-index: 1000;
    }
  }
}

:deep(.el-tabs__nav-wrap) {
  padding: 0 10px;
}

:deep(.el-tabs__item) {
  color: #fff !important;
  border: none !important;
  background-color: transparent;
  height: 40px;
  line-height: 40px;
  
  &.is-active {
    background-color: #1e1e1e;
  }
  
  &:hover {
    color: #409eff !important;
  }
}
</style> 