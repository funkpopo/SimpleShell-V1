<script setup lang="ts">
import { ref, onMounted } from 'vue'
import NightIcon from './assets/night.svg'
import DayIcon from './assets/day.svg'
import SettingsNightIcon from './assets/settings-night.svg'
import SettingsDayIcon from './assets/settings-day.svg'
import SystemMonitor from './components/SystemMonitor.vue'
import ConnectionManager from './components/ConnectionManager.vue'
import MainContent from './components/MainContent.vue'

// 定义MainContent组件实例的类型
interface MainContentInstance {
  addLocalTerminal: () => void
  addSshConnection: (connection: any) => void
}

// 主题状态
const isDarkTheme = ref(true)
const toggleTheme = () => {
  isDarkTheme.value = !isDarkTheme.value
}

// 设置状态
const isSettingsExpanded = ref(false)
const toggleSettings = () => {
  isSettingsExpanded.value = !isSettingsExpanded.value
}

// 左侧边栏状态
const isLeftSidebarExpanded = ref(true)
const sidebarWidth = ref(250)
const lastSidebarWidth = ref(250)
const isDragging = ref(false)

// 右侧边栏状态
const isRightSidebarExpanded = ref(true)
const rightSidebarWidth = ref(250)
const lastRightSidebarWidth = ref(250)
const isRightDragging = ref(false)
// 右侧边栏分割线位置（百分比）
const rightSidebarSplitPosition = ref(50)
const isRightSplitDragging = ref(false)

// 左侧边栏方法
const toggleLeftSidebar = () => {
  if (isLeftSidebarExpanded.value) {
    lastSidebarWidth.value = sidebarWidth.value
  } else {
    sidebarWidth.value = lastSidebarWidth.value
  }
  isLeftSidebarExpanded.value = !isLeftSidebarExpanded.value
}

const handleMouseDown = () => {
  if (!isLeftSidebarExpanded.value) return
  isDragging.value = true
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const newWidth = e.clientX
  if (newWidth >= 100 && newWidth <= 500) {
    sidebarWidth.value = newWidth
  }
}

const handleMouseUp = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
}

// 右侧边栏方法
const toggleRightSidebar = () => {
  if (isRightSidebarExpanded.value) {
    lastRightSidebarWidth.value = rightSidebarWidth.value
  } else {
    rightSidebarWidth.value = lastRightSidebarWidth.value
  }
  isRightSidebarExpanded.value = !isRightSidebarExpanded.value
}

const handleRightMouseDown = () => {
  if (!isRightSidebarExpanded.value) return
  isRightDragging.value = true
  document.addEventListener('mousemove', handleRightMouseMove)
  document.addEventListener('mouseup', handleRightMouseUp)
}

const handleRightMouseMove = (e: MouseEvent) => {
  if (!isRightDragging.value) return
  const newWidth = window.innerWidth - e.clientX
  if (newWidth >= 100 && newWidth <= 500) {
    rightSidebarWidth.value = newWidth
  }
}

const handleRightMouseUp = () => {
  isRightDragging.value = false
  document.removeEventListener('mousemove', handleRightMouseMove)
  document.removeEventListener('mouseup', handleRightMouseUp)
}

// 处理右侧边栏分割线拖动
const handleRightSplitMouseDown = (e: MouseEvent) => {
  e.preventDefault()
  isRightSplitDragging.value = true
  document.addEventListener('mousemove', handleRightSplitMouseMove)
  document.addEventListener('mouseup', handleRightSplitMouseUp)
}

const handleRightSplitMouseMove = (e: MouseEvent) => {
  if (!isRightSplitDragging.value) return
  const sidebarRect = document.querySelector('.right-sidebar-content')?.getBoundingClientRect()
  if (!sidebarRect) return
  
  const offsetY = e.clientY - sidebarRect.top
  const percentage = Math.round((offsetY / sidebarRect.height) * 100)
  
  // 限制拖动范围在20%-80%之间
  if (percentage >= 20 && percentage <= 80) {
    rightSidebarSplitPosition.value = percentage
  }
}

const handleRightSplitMouseUp = () => {
  isRightSplitDragging.value = false
  document.removeEventListener('mousemove', handleRightSplitMouseMove)
  document.removeEventListener('mouseup', handleRightSplitMouseUp)
}

// 获取MainContent组件的引用
const mainContentRef = ref<MainContentInstance | null>(null)

// 处理连接请求
const handleConnectToServer = (connection: any) => {
  if (mainContentRef.value) {
    // 创建新的SSH终端标签页
    mainContentRef.value.addSshConnection(connection)
  }
}

// 在组件加载后设置键盘快捷键
onMounted(() => {
  // 设置主题切换快捷键
  window.addEventListener('keydown', (e) => {
    // Alt+T 切换主题
    if (e.altKey && e.key === 't') {
      toggleTheme()
    }
    
    // Alt+L 打开新的本地终端
    if (e.altKey && e.key === 'l' && mainContentRef.value) {
      mainContentRef.value.addLocalTerminal()
    }
  })
})
</script>

<template>
  <div class="app-container" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 左侧边栏 -->
    <div
      class="left-sidebar"
      :class="{ 'left-sidebar-collapsed': !isLeftSidebarExpanded }"
      :style="isLeftSidebarExpanded ? { width: sidebarWidth + 'px' } : {}"
    >
      <div class="left-sidebar-toggle" @click="toggleLeftSidebar">
        {{ isLeftSidebarExpanded ? '' : '' }}
      </div>
      <div class="left-sidebar-content">
        <transition name="fade-slide">
          <div v-show="isLeftSidebarExpanded" class="left-sidebar-items">
          </div>
        </transition>
      </div>
      <div v-show="isLeftSidebarExpanded" class="resize-handle" @mousedown="handleMouseDown"></div>
      <!-- 按钮容器 -->
      <div class="sidebar-buttons">
        <!-- 主题切换按钮 -->
        <div class="theme-toggle" @click="toggleTheme">
          <img
            :src="isDarkTheme ? NightIcon : DayIcon"
            :alt="isDarkTheme ? '切换到日间模式' : '切换到夜间模式'"
            class="theme-icon"
          />
        </div>
        <!-- 设置按钮 -->
        <div class="settings-toggle" @click="toggleSettings">
          <img
            :src="isDarkTheme ? SettingsNightIcon : SettingsDayIcon"
            alt="'设置'"
            class="settings-icon"
          />
        </div>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <MainContent
      ref="mainContentRef"
      :is-dark-theme="isDarkTheme"
    />

    <!-- 右侧边栏 -->
    <div
      class="right-sidebar"
      :class="{ 'right-sidebar-collapsed': !isRightSidebarExpanded }"
      :style="isRightSidebarExpanded ? { width: rightSidebarWidth + 'px' } : {}"
    >
      <div class="right-sidebar-toggle" @click="toggleRightSidebar">
        {{ isRightSidebarExpanded ? '' : '' }}
      </div>
      <div class="right-sidebar-content">
        <div class="right-sidebar-items">
          <!-- 上半部分：系统监控 -->
          <div 
            class="monitor-section"
            :style="{ height: rightSidebarSplitPosition + '%' }"
          >
            <SystemMonitor />
          </div>
          
          <!-- 分隔线 -->
          <div 
            class="right-sidebar-splitter"
            @mousedown="handleRightSplitMouseDown"
          ></div>
          
          <!-- 下半部分：连接管理 -->
          <div 
            class="connection-section"
            :style="{ height: (100 - rightSidebarSplitPosition) + '%' }"
          >
            <ConnectionManager 
              :is-dark-theme="isDarkTheme" 
              @connect-to-server="handleConnectToServer"
            />
          </div>
        </div>
      </div>
      <div
        v-show="isRightSidebarExpanded"
        class="resize-handle"
        @mousedown="handleRightMouseDown"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  margin: 0;
  padding: 0;
  position: fixed;
  top: 0;
  left: 0;
  background-color: #ffffff;
  color: #2c3e50;
  transition:
    background-color 0.3s,
    color 0.3s;
  justify-content: space-between;
  box-sizing: border-box;
}

.app-container.dark-theme {
  background-color: #1a1a1a;
  color: #ffffff;
}

.left-sidebar,
.right-sidebar {
  position: relative;
  width: 250px;
  min-width: 100px;
  max-width: 500px;
  background-color: #c0c0c0;
  color: #333;
  height: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  box-sizing: border-box;
}

.dark-theme .left-sidebar,
.dark-theme .right-sidebar {
  background-color: #1e1e1e;
  color: #fff;
}

.left-sidebar-content,
.right-sidebar-content {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

/* 按钮容器样式 */
.sidebar-buttons {
  position: absolute;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 5px;
  padding: 0 4px;
  transition: all 0.2s ease-in-out;
}

/* 调整按钮基础样式 */
.theme-toggle,
.settings-toggle {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease-in-out;
  z-index: 1000;
}

.dark-theme .theme-toggle,
.dark-theme .settings-toggle {
  background-color: rgba(255, 255, 255, 0.1);
}

.theme-toggle:hover,
.settings-toggle:hover {
  background-color: rgba(0, 0, 0, 0.15);
}

.dark-theme .theme-toggle:hover,
.dark-theme .settings-toggle:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.theme-icon,
.settings-icon {
  width: 20px;
  height: 20px;
}

/* 收起状态下的按钮样式 */
.left-sidebar-collapsed .sidebar-buttons {
  flex-direction: column;
  align-items: center;
}

.resize-handle {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  cursor: ew-resize;
  background-color: transparent;
  transition: background-color 0.2s;
  z-index: 10;
}

.left-sidebar .resize-handle {
  right: 0;
}

.right-sidebar .resize-handle {
  left: 0;
}

.resize-handle:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.resize-handle:active {
  background-color: rgba(255, 255, 255, 0.2);
}

.left-sidebar-collapsed,
.right-sidebar-collapsed {
  width: 40px;
  min-width: 40px;
  max-width: 40px;
  resize: none;
  margin: 0;
  padding: 0;
  transition:
    width 0.2s ease-in-out,
    min-width 0.2s ease-in-out,
    max-width 0.2s ease-in-out;
}

.left-sidebar-toggle,
.right-sidebar-toggle {
  position: absolute;
  width: 10px;
  height: 100px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background-color: #a0a0a0;
  color: #333;
  transition: background-color 0.2s;
  z-index: 1000;
}

.dark-theme .left-sidebar-toggle,
.dark-theme .right-sidebar-toggle {
  background-color: #535353;
  color: #fff;
}

.left-sidebar-toggle {
  right: -10px;
  border-radius: 0 4px 4px 0;
}

.right-sidebar-toggle {
  left: -10px;
  border-radius: 4px 0 0 4px;
  z-index: 100;
}

/* 确保折叠状态下的右侧切换按钮能够正确显示 */
.right-sidebar-collapsed .right-sidebar-toggle {
  left: -10px;
  position: absolute;
}

/* 确保切换按钮不会被遮挡 */
.right-sidebar {
  position: relative;
  z-index: 10;
}

.left-sidebar-toggle:hover,
.right-sidebar-toggle:hover {
  background-color: #cccbcb;
}

.dark-theme .left-sidebar-toggle:hover,
.dark-theme .right-sidebar-toggle:hover {
  background-color: #888888;
}

.left-sidebar-items {
  padding: 20px;
}

.right-sidebar-items {
  padding-left: 4px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.monitor-section,
.connection-section {
  width: 100%;
  overflow: auto;
  position: relative;
}

.right-sidebar-splitter {
  height: 6px;
  width: 100%;
  background-color: #a0a0a0;
  cursor: ns-resize;
  flex-shrink: 0;
  position: relative;
}

.dark-theme .right-sidebar-splitter {
  background-color: #535353;
}

.right-sidebar-splitter:hover {
  background-color: #cccbcb;
}

.dark-theme .right-sidebar-splitter:hover {
  background-color: #888888;
}

.right-sidebar-collapsed .right-sidebar-items {
  padding: 0;
}

.right-sidebar-collapsed .right-sidebar-content {
  overflow: visible;
}

.left-sidebar-items h3,
.right-sidebar-items h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: inherit;
}

.left-sidebar-items ul,
.right-sidebar-items ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.left-sidebar-items li,
.right-sidebar-items li {
  margin-bottom: 10px;
}

.left-sidebar-items a,
.right-sidebar-items a {
  color: #333;
  text-decoration: none;
}

.dark-theme .left-sidebar-items a,
.dark-theme .right-sidebar-items a {
  color: white;
}

.left-sidebar-items a:hover,
.right-sidebar-items a:hover {
  text-decoration: underline;
}

/* 保持原有样式 */
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}

/* 添加过渡动画样式 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease-in-out;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.right-sidebar .fade-slide-enter-from,
.right-sidebar .fade-slide-leave-to {
  transform: translateX(20px);
}

/* 确保主内容区域填充可用空间 */
:deep(MainContent) {
  flex: 1;
  min-width: 0;
}

/* 确保主内容容器内部也能自适应宽度 */
:deep(.main-content-container) {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
</style>
