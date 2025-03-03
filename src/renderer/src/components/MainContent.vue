<script setup lang="ts">
import { ref, onMounted, computed, defineExpose } from 'vue'
import TerminalView from './TerminalView.vue'

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

interface TabItem {
  id: string
  name: string
  type: 'ssh' | 'local'
  connection?: Connection | null
  active: boolean
}

// 从父组件接收主题状态
const props = defineProps<{
  isDarkTheme: boolean
}>()

// 定义欢迎信息和标签页状态
const welcomeVisible = ref(true)
const tabs = ref<TabItem[]>([])
const activeTabId = ref<string | null>(null)

// 计算是否显示标签栏
const showTabBar = computed(() => tabs.value.length > 0)

// 添加标签页
const addTab = (type: 'ssh' | 'local', connection?: Connection) => {
  // 如果是第一个标签，隐藏欢迎页
  if (tabs.value.length === 0) {
    welcomeVisible.value = false
  }
  
  // 生成唯一ID
  const id = Date.now().toString()
  
  // 创建新标签
  const newTab: TabItem = {
    id,
    name: type === 'local' ? '本地终端' : connection?.name || '未命名连接',
    type,
    connection: type === 'ssh' ? connection : null,
    active: false
  }
  
  // 添加到标签列表
  tabs.value.push(newTab)
  
  // 切换到新标签
  setActiveTab(id)
  
  return id
}

// 设置活动标签
const setActiveTab = (id: string) => {
  // 先将所有标签设置为非活动
  tabs.value.forEach(tab => {
    tab.active = false
  })
  
  // 设置指定标签为活动
  const tab = tabs.value.find(t => t.id === id)
  if (tab) {
    tab.active = true
    activeTabId.value = id
  }
}

// 关闭标签
const closeTab = (id: string) => {
  const index = tabs.value.findIndex(t => t.id === id)
  if (index !== -1) {
    // 如果关闭的是当前活动标签，需要激活另一个标签
    if (tabs.value[index].active) {
      // 优先激活右侧标签，如果没有则激活左侧标签
      if (index < tabs.value.length - 1) {
        setActiveTab(tabs.value[index + 1].id)
      } else if (index > 0) {
        setActiveTab(tabs.value[index - 1].id)
      } else {
        // 如果没有其他标签了，显示欢迎页
        activeTabId.value = null
        welcomeVisible.value = true
      }
    }
    
    // 移除标签
    tabs.value.splice(index, 1)
    
    // 如果没有标签了，显示欢迎页
    if (tabs.value.length === 0) {
      welcomeVisible.value = true
    }
  }
}

// 添加本地终端标签
const addLocalTerminal = () => {
  addTab('local')
}

// 添加SSH连接标签 (将由ConnectionManager组件调用)
const addSshConnection = (connection: Connection) => {
  addTab('ssh', connection)
}

// 定义方法供父组件使用
defineExpose({
  addLocalTerminal,
  addSshConnection
})

// 在组件挂载时监听连接请求
onMounted(() => {
  
})
</script>

<template>
  <div class="main-content-container">
    <!-- 欢迎页 -->
    <div v-if="welcomeVisible" class="welcome-section">
      <h1>欢迎使用 OShell</h1>
      
      <div class="quick-actions">
        <div class="action-card" @click="addLocalTerminal">
          <div class="action-icon windows-terminal-icon"></div>
          <h3>打开本地终端</h3>
          <p>在本地系统中打开命令行终端</p>
        </div>
        
        <div class="action-card info-card">
          <div class="action-icon info-icon"></div>
          <h3>SSH连接</h3>
          <p>从右侧连接管理面板选择一个SSH连接</p>
        </div>
      </div>
    </div>
    
    <!-- 终端标签页 -->
    <div v-if="!welcomeVisible" class="terminal-tabs-container">
      <!-- 标签栏 -->
      <div v-if="showTabBar" class="tabs-header">
        <div 
          v-for="tab in tabs" 
          :key="tab.id"
          class="tab"
          :class="{ active: tab.active }"
          @click="setActiveTab(tab.id)"
        >
          <span class="tab-icon" :class="tab.type"></span>
          <span class="tab-name">{{ tab.name }}</span>
          <span class="tab-close" @click.stop="closeTab(tab.id)">&times;</span>
        </div>
        
        <div class="tab-actions">
          <button class="add-tab-btn" @click="addLocalTerminal" title="新建本地终端">+</button>
        </div>
      </div>
      
      <!-- 终端内容区 -->
      <div class="terminal-content">
        <template v-for="tab in tabs" :key="tab.id">
          <div v-show="tab.active" class="terminal-tab-content">
            <TerminalView
              :connection="tab.connection"
              :is-dark-theme="props.isDarkTheme"
              :is-local-mode="tab.type === 'local'"
            />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-content-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-color);
  color: var(--text-color);
}

/* 欢迎页样式 */
.welcome-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  text-align: center;
}

.welcome-section h1 {
  font-size: 2.5em;
  margin-bottom: 40px;
  font-weight: 600;
  background: linear-gradient(45deg, #2196f3, #4caf50);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-top: 0;
}

.quick-actions {
  display: flex;
  gap: 20px;
  margin-top: 20px;
  justify-content: center;
  flex-wrap: wrap;
  max-width: 800px;
}

.action-card {
  background-color: var(--card-bg);
  border-radius: 10px;
  padding: 25px;
  width: 250px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--border-color);
}

.action-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15);
}

.info-card {
  cursor: default;
  opacity: 0.8;
}

.info-card:hover {
  transform: none;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.action-icon {
  width: 60px;
  height: 60px;
  margin-bottom: 15px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
  opacity: 0.8;
}

.local-terminal-icon {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%230078d7'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z'/%3E%3C/svg%3E");
}

.info-icon {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232196f3'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M11 7h2v2h-2zm0 4h2v6h-2zm1-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z'/%3E%3C/svg%3E");
}

.action-card h3 {
  margin: 0 0 10px 0;
  font-size: 1.2em;
  font-weight: 500;
}

.action-card p {
  margin: 0;
  opacity: 0.8;
  font-size: 0.9em;
  line-height: 1.4;
}

/* 终端标签页容器 */
.terminal-tabs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 标签栏样式 */
.tabs-header {
  display: flex;
  background-color: var(--tabs-bg);
  border-bottom: 1px solid var(--border-color);
  height: 36px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
}

.tabs-header::-webkit-scrollbar {
  display: none;
}

.tab {
  display: flex;
  align-items: center;
  padding: 0 15px;
  height: 36px;
  min-width: 100px;
  max-width: 180px;
  border-right: 1px solid var(--border-color);
  background-color: var(--tab-bg);
  color: var(--tab-color);
  cursor: pointer;
  user-select: none;
  position: relative;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.tab.active {
  background-color: var(--tab-active-bg);
  color: var(--tab-active-color);
  border-bottom: 2px solid var(--tab-active-border);
}

.tab-icon {
  width: 16px;
  height: 16px;
  margin-right: 8px;
  background-position: center;
  background-repeat: no-repeat;
  background-size: contain;
}

.tab-icon.ssh {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2303a9f4'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14c0 1.1.9 2 2 2h4v-2H5V5h4V3H5c-1.1 0-2 .9-2 2zm16-2v2h2c0-1.1-.9-2-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8c1.1 0 2-.9 2-2h-2v2z'/%3E%3C/svg%3E");
}

.tab-icon.local {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234caf50'%3E%3Cpath d='M0 0h24v24H0V0z' fill='none'/%3E%3Cpath d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-9 13h8c.55 0 1-.45 1-1s-.45-1-1-1h-8c-.55 0-1 .45-1 1s.45 1 1 1zm0-4h8c.55 0 1-.45 1-1s-.45-1-1-1h-8c-.55 0-1 .45-1 1s.45 1 1 1zm0-4h8c.55 0 1-.45 1-1s-.45-1-1-1h-8c-.55 0-1 .45-1 1s.45 1 1 1zM5 7c-.55 0-1 .45-1 1s.45 1 1 1h.75L3 12.75v.67c0 .55.45 1 1 1s1-.45 1-1v-.75l2.75-3.75h.33c.55 0 1-.45 1-1s-.45-1-1-1H5z'/%3E%3C/svg%3E");
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
}

.tab-close {
  width: 16px;
  height: 16px;
  margin-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 14px;
  opacity: 0.5;
  transition: all 0.2s ease;
}

.tab-close:hover {
  background-color: var(--tab-close-hover-bg);
  opacity: 1;
}

.tab-actions {
  display: flex;
  align-items: center;
  padding: 0 10px;
  margin-left: auto;
}

.add-tab-btn {
  background: none;
  border: none;
  color: var(--tab-color);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.add-tab-btn:hover {
  background-color: var(--tab-add-hover-bg);
}

/* 终端内容区 */
.terminal-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  width: 100%;
  height: 100%;
}

.terminal-tab-content {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* 主题变量 */
:root {
  --bg-color: #f5f5f5;
  --text-color: #333;
  --card-bg: #ffffff;
  --border-color: #e0e0e0;
  --tabs-bg: #f0f0f0;
  --tab-bg: #f0f0f0;
  --tab-color: #555;
  --tab-active-bg: #ffffff;
  --tab-active-color: #2196f3;
  --tab-active-border: #2196f3;
  --tab-close-hover-bg: rgba(0, 0, 0, 0.1);
  --tab-add-hover-bg: rgba(0, 0, 0, 0.1);
}

:root .dark-theme {
  --bg-color: #1a1a1a;
  --text-color: #eee;
  --card-bg: #272727;
  --border-color: #444;
  --tabs-bg: #1e1e1e;
  --tab-bg: #1e1e1e;
  --tab-color: #bbb;
  --tab-active-bg: #2d2d2d;
  --tab-active-color: #64b5f6;
  --tab-active-border: #64b5f6;
  --tab-close-hover-bg: rgba(255, 255, 255, 0.1);
  --tab-add-hover-bg: rgba(255, 255, 255, 0.1);
}
</style> 