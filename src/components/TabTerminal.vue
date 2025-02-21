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
        <div class="terminal-wrapper" :id="'terminal-' + item.name"></div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from '@vue/runtime-core'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

interface TerminalTab {
  name: string
  title: string
  terminal?: Terminal
  fitAddon?: FitAddon
}

export default defineComponent({
  name: 'TabTerminal',
  setup() {
    const tabs = ref<TerminalTab[]>([])
    const activeTab = ref('')
    let tabIndex = 0

    const initTerminal = (name: string) => {
      const terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Consolas, monospace',
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff'
        }
      })
      
      const fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())
      
      setTimeout(() => {
        const element = document.getElementById(`terminal-${name}`)
        if (element) {
          terminal.open(element)
          fitAddon.fit()
        }
      }, 0)
      
      return { terminal, fitAddon }
    }

    const addNewTab = () => {
      const name = `terminal-${tabIndex++}`
      const tab: TerminalTab = {
        name,
        title: `终端 ${tabIndex}`
      }
      
      tabs.value.push(tab)
      activeTab.value = name
      
      setTimeout(() => {
        const { terminal, fitAddon } = initTerminal(name)
        tab.terminal = terminal
        tab.fitAddon = fitAddon
      }, 0)
    }

    const removeTab = (targetName: string) => {
      const tab = tabs.value.find((tab: TerminalTab) => tab.name === targetName)
      if (tab?.terminal) {
        tab.terminal.dispose()
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

    onMounted(() => {
      addNewTab()
      window.addEventListener('resize', () => {
        const tab = tabs.value.find((tab: TerminalTab) => tab.name === activeTab.value)
        if (tab?.fitAddon) {
          tab.fitAddon.fit()
        }
      })
    })

    return {
      tabs,
      activeTab,
      addNewTab,
      removeTab,
      switchTab
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
      order: -1; /* 确保header在最上方 */
    }
    
    .el-tabs__content {
      flex: 1;
      padding: 0;
      height: calc(100% - 40px); /* 减去tabs header的高度 */
      overflow: hidden; /* 防止内容溢出 */
    }
    
    .el-tab-pane {
      height: 100%;
    }
  }
  
  .terminal-wrapper {
    height: 100%;
    padding: 10px;
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