<script setup>
import { ref } from 'vue'
import FileExplorer from './components/FileExplorer.vue'
import TabBar from './components/TabBar.vue'
import TerminalView from './components/TerminalView.vue'
import SystemStats from './components/SystemStats.vue'

const tabBarRef = ref(null)
const activeTerminal = ref({
  type: 'local',
  connectionId: null
})

// 处理标签页变化
const handleTabChange = (tab) => {
  activeTerminal.value = tab
}

// 处理SSH连接
const handleSSHConnect = (connectionId) => {
  tabBarRef.value.addSSHTab(connectionId)
}

// 处理SSH状态更新
const handleSSHStatusUpdate = (connectionId, status) => {
  tabBarRef.value.updateSSHTabStatus(connectionId, status)
}
</script>

<template>
  <div class="app-container">
    <!-- 左侧文件管理区域 -->
    <div class="sidebar">
      <div class="logo">
        <img src="./assets/logo.png" alt="SimpleShell" />
        <span>SimpleShell</span>
      </div>
      <file-explorer @connect="handleSSHConnect" @status-change="handleSSHStatusUpdate" />
    </div>

    <!-- 右侧主要内容区域 -->
    <div class="main-content">
      <!-- 顶部标签栏 -->
      <div class="tabs">
        <tab-bar ref="tabBarRef" @change="handleTabChange" />
      </div>

      <!-- 终端区域 -->
      <div class="terminal-container">
        <terminal-view :connection-id="activeTerminal.type === 'ssh' ? activeTerminal.connectionId : null" />
      </div>

      <!-- 右侧系统监控面板 -->
      <div class="system-monitor">
        <system-stats />
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --primary-bg: #1e1e1e;
  --secondary-bg: #252526;
  --border-color: #3c3c3c;
  --text-color: #cccccc;
  --active-color: #0078d4;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
    Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--primary-bg);
  color: var(--text-color);
}

.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  background-color: var(--secondary-bg);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
}

.logo {
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
}

.logo img {
  width: 24px;
  height: 24px;
}

.logo span {
  font-size: 16px;
  font-weight: 500;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.tabs {
  height: 35px;
  background-color: var(--secondary-bg);
  border-bottom: 1px solid var(--border-color);
}

.terminal-container {
  flex: 1;
  background-color: var(--primary-bg);
  position: relative;
}

.system-monitor {
  width: 200px;
  background-color: var(--secondary-bg);
  border-left: 1px solid var(--border-color);
  padding: 16px;
}
</style>
