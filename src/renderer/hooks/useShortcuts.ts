import { onMounted, onUnmounted } from '@vue/runtime-core'
import { useTerminalStore } from '../store'

type ShortcutEvent = 
  | 'shortcut:new-tab'
  | 'shortcut:close-tab'
  | 'shortcut:next-tab'
  | 'shortcut:prev-tab'
  | 'shortcut:connection-manager'

export function useShortcuts() {
  const terminalStore = useTerminalStore()
  
  const handleShortcut = (event: ShortcutEvent) => {
    switch (event) {
      case 'shortcut:new-tab':
        // 打开连接管理器
        break
        
      case 'shortcut:close-tab':
        if (terminalStore.activeTab) {
          terminalStore.removeTab(terminalStore.activeTab)
        }
        break
        
      case 'shortcut:next-tab':
        terminalStore.nextTab()
        break
        
      case 'shortcut:prev-tab':
        terminalStore.prevTab()
        break
        
      case 'shortcut:connection-manager':
        // 打开连接管理器
        break
    }
  }
  
  onMounted(() => {
    window.electron.ipcRenderer.on('shortcut', handleShortcut)
  })
  
  onUnmounted(() => {
    window.electron.ipcRenderer.removeListener('shortcut', handleShortcut)
  })
} 