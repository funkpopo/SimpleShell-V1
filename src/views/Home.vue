<template>
  <div class="home-container">
    <!-- 左侧文件管理器 -->
    <div class="file-manager" ref="fileManager" @mousedown="startResizeFileManager">
      <FileManager />
    </div>
    
    <!-- 中间终端区域 -->
    <div class="terminal-container">
      <TabTerminal />
    </div>
    
    <!-- 右侧系统监控 -->
    <div class="system-monitor" ref="systemMonitor" @mousedown="startResizeSystemMonitor">
      <SystemMonitor />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent, ref, onUnmounted } from '@vue/runtime-core'
import FileManager from '@/components/FileManager.vue'
import TabTerminal from '@/components/TabTerminal.vue'
import SystemMonitor from '@/components/SystemMonitor.vue'

export default defineComponent({
  name: 'Home',
  components: {
    FileManager,
    TabTerminal,
    SystemMonitor
  },
  setup() {
    const fileManager = ref<HTMLElement | null>(null)
    const systemMonitor = ref<HTMLElement | null>(null)
    let isResizing = false
    let currentResizer: 'fileManager' | 'systemMonitor' | null = null
    let startX = 0
    let startWidth = 0

    const startResizeFileManager = (e: MouseEvent) => {
      // 只在右边缘4px范围内才开始调整
      const rect = fileManager.value?.getBoundingClientRect()
      if (!rect || e.clientX < rect.right - 4) return

      isResizing = true
      currentResizer = 'fileManager'
      startX = e.clientX
      startWidth = rect.width
      // 禁用文字选择
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', stopResize)
      e.preventDefault()
    }

    const startResizeSystemMonitor = (e: MouseEvent) => {
      // 只在左边缘4px范围内才开始调整
      const rect = systemMonitor.value?.getBoundingClientRect()
      if (!rect || e.clientX > rect.left + 4) return

      isResizing = true
      currentResizer = 'systemMonitor'
      startX = e.clientX
      startWidth = rect.width
      // 禁用文字选择
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', stopResize)
      e.preventDefault()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return

      const element = currentResizer === 'fileManager' ? fileManager.value : systemMonitor.value
      if (!element) return

      // 统一最小和最大宽度
      const minWidth = 200
      const maxWidth = 400
      
      if (currentResizer === 'fileManager') {
        const width = startWidth + (e.clientX - startX)
        if (width >= minWidth && width <= maxWidth) {
          element.style.width = `${width}px`
        }
      } else {
        const width = startWidth - (e.clientX - startX)
        if (width >= minWidth && width <= maxWidth) {
          element.style.width = `${width}px`
        }
      }
    }

    const stopResize = () => {
      isResizing = false
      currentResizer = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResize)
      // 恢复文字选择
      document.body.style.userSelect = 'auto'
      document.body.style.webkitUserSelect = 'auto'
    }

    onUnmounted(() => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResize)
    })

    return {
      fileManager,
      systemMonitor,
      startResizeFileManager,
      startResizeSystemMonitor
    }
  }
})
</script>

<style lang="scss" scoped>
.home-container {
  height: 100%;
  display: flex;
  flex-direction: row;
  overflow: hidden;
  background-color: #1e1e1e;
  color: #fff;
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
  
  .file-manager {
    width: 250px;
    min-width: 200px;
    max-width: 400px;
    border-right: 1px solid #333;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;

    &:hover {
      cursor: col-resize;
    }

    /* 添加右侧边缘视觉指示器 */
    &::after {
      content: '';
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background-color: transparent;
      transition: background-color 0.2s;
      cursor: col-resize;
    }

    &:hover::after {
      background-color: #409eff;
    }
  }
  
  .terminal-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 300px;
  }
  
  .system-monitor {
    width: 300px;
    min-width: 200px;
    max-width: 400px;
    border-left: 1px solid #333;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;

    /* 移除整体hover效果 */
    &:hover {
      cursor: default;  /* 改为默认光标 */
    }

    /* 左侧边缘视觉指示器 */
    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 4px;
      background-color: transparent;
      transition: background-color 0.2s;
      cursor: col-resize;
      z-index: 1;  /* 确保边缘区域在内容之上 */
    }

    &:hover::before {
      background-color: #409eff;
    }
  }
}
</style> 