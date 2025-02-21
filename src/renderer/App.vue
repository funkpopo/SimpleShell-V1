<template>
  <div class="app-container">
    <div class="file-tree">
      <FileTree />
    </div>
    <div class="main-content">
      <TerminalContainer />
    </div>
    <div class="monitor-panel">
      <SystemMonitor />
    </div>
  </div>
</template>

<script setup lang="ts">
import FileTree from './components/FileTree.vue'
import TerminalContainer from './components/TerminalContainer.vue'
import SystemMonitor from './components/SystemMonitor.vue'
</script>

<style scoped>
.app-container {
  display: flex;
  height: 100vh;
  background: #1e1e1e;
  color: #fff;
}

.file-tree {
  width: 240px;
  border-right: 1px solid #333;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.monitor-panel {
  width: 240px;
}
</style> 