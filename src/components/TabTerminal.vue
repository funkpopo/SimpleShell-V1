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
    
    <div class="add-terminal">
      <el-button type="primary" @click="addNewTab">
        <el-icon><Plus /></el-icon>
        新建终端
      </el-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
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
    
    .el-tabs__content {
      flex: 1;
      padding: 0;
    }
    
    .el-tab-pane {
      height: 100%;
    }
  }
  
  .terminal-wrapper {
    height: 100%;
    padding: 10px;
  }
  
  .add-terminal {
    padding: 10px;
    border-top: 1px solid #333;
    
    .el-button {
      width: 100%;
    }
  }
}
</style> 