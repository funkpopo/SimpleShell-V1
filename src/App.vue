<template>
  <div class="app-container">
    <!-- 左侧文件管理器 -->
    <div class="file-manager">
      <FileManager />
    </div>
    
    <!-- 中间终端区域 -->
    <div class="terminal-container">
      <TabTerminal />
    </div>
    
    <!-- 右侧系统监控 -->
    <div class="system-monitor">
      <SystemMonitor />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import FileManager from '@/components/FileManager.vue'
import TabTerminal from '@/components/TabTerminal.vue'
import SystemMonitor from '@/components/SystemMonitor.vue'

export default defineComponent({
  name: 'App',
  components: {
    FileManager,
    TabTerminal,
    SystemMonitor
  }
})
</script>

<style lang="scss">
.app-container {
  display: flex;
  height: 100vh;
  background-color: #1e1e1e;
  color: #fff;
  
  .file-manager {
    width: 250px;
    border-right: 1px solid #333;
  }
  
  .terminal-container {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  .system-monitor {
    width: 300px;
    border-left: 1px solid #333;
  }
}

html, body {
  margin: 0;
  padding: 0;
  font-family: 'Consolas', monospace;
}
</style> 