<template>
  <div class="app-container">
    <!-- 左侧文件树 -->
    <div class="sidebar">
      <FileTree />
    </div>
    
    <!-- 中间终端区域 -->
    <div class="main-content">
      <TabBar />
      <TerminalContainer />
    </div>
    
    <!-- 右侧系统监控 -->
    <div class="system-monitor">
      <SystemMonitor />
    </div>
  </div>
</template>

<script setup lang="ts">
import FileTree from './components/FileTree.vue'
import TabBar from './components/TabBar.vue'
import TerminalContainer from './components/TerminalContainer.vue'
import SystemMonitor from './components/SystemMonitor.vue'
</script>

<style>
html, body {
  margin: 0;
  padding: 0;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-container {
  display: flex;
  height: 100vh;
  background: #1e1e1e;
  color: #fff;
}

.sidebar {
  width: 250px;
  background: #252526;
  border-right: 1px solid #333;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.system-monitor {
  width: 300px;
  background: #252526;
  border-left: 1px solid #333;
}
</style> 