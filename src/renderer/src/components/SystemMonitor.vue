<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

interface SystemInfo {
  osInfo: {
    platform: string
    release: string
    arch: string
  }
  cpuInfo: {
    usage: number
    model: string
    cores: number
  }
  memoryInfo: {
    total: number
    free: number
    used: number
    usedPercentage: number
  }
}

const systemInfo = ref<SystemInfo>({
  osInfo: {
    platform: '',
    release: '',
    arch: ''
  },
  cpuInfo: {
    usage: 0,
    model: '',
    cores: 0
  },
  memoryInfo: {
    total: 0,
    free: 0,
    used: 0,
    usedPercentage: 0
  }
})

// 更新系统信息
const updateSystemInfo = async () => {
  try {
    const info = await window.api.getSystemInfo()
    systemInfo.value = info
  } catch (error) {
    console.error('Failed to get system info:', error)
  }
}

let updateInterval: ReturnType<typeof setInterval>

onMounted(() => {
  updateSystemInfo()
  updateInterval = setInterval(updateSystemInfo, 2000)
})

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval)
  }
})

const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${Math.round(size * 100) / 100} ${units[unitIndex]}`
}

// 计算进度条颜色
const getProgressColor = (value: number) => {
  if (value >= 90) return '#ff4757'
  if (value >= 80) return '#ff6b81'
  if (value >= 70) return '#FF7043'
  if (value >= 60) return '#FFA726'
  return '#4CAF50'
}

const cpuProgressStyle = computed(() => ({
  width: `${systemInfo.value.cpuInfo.usage}%`,
  background: `linear-gradient(to right, ${getProgressColor(systemInfo.value.cpuInfo.usage)}, ${getProgressColor(systemInfo.value.cpuInfo.usage)}bb)`
}))

const memoryProgressStyle = computed(() => ({
  width: `${systemInfo.value.memoryInfo.usedPercentage}%`,
  background: `linear-gradient(to right, ${getProgressColor(systemInfo.value.memoryInfo.usedPercentage)}, ${getProgressColor(systemInfo.value.memoryInfo.usedPercentage)}bb)`
}))
</script>

<template>
  <div class="system-monitor">
    <!-- 迷你监控 -->
    <div class="mini-monitor">
      <div 
        class="mini-progress cpu" 
        data-type="CPU"
        :title="`CPU使用率: ${systemInfo.cpuInfo.usage}%\n型号: ${systemInfo.cpuInfo.model}\n核心数: ${systemInfo.cpuInfo.cores}`"
      >
        <div 
          class="mini-progress-bar"
          :style="{ 
            height: `${systemInfo.cpuInfo.usage}%`, 
            background: getProgressColor(systemInfo.cpuInfo.usage),
            backgroundImage: 'var(--progress-gradient)'
          }"
        ></div>
        <span class="mini-progress-text">{{ systemInfo.cpuInfo.usage }}%</span>
      </div>
      <div 
        class="mini-progress memory"
        data-type="MEM"
        :title="`内存使用率: ${systemInfo.memoryInfo.usedPercentage}%\n总内存: ${formatBytes(systemInfo.memoryInfo.total)}\n已用: ${formatBytes(systemInfo.memoryInfo.used)}`"
      >
        <div 
          class="mini-progress-bar"
          :style="{ 
            height: `${systemInfo.memoryInfo.usedPercentage}%`, 
            background: getProgressColor(systemInfo.memoryInfo.usedPercentage),
            backgroundImage: 'var(--progress-gradient)'
          }"
        ></div>
        <span class="mini-progress-text">{{ systemInfo.memoryInfo.usedPercentage }}%</span>
      </div>
    </div>

    <div class="monitor-section">
      <h3>操作系统信息</h3>
      <div class="info-item">
        <span>平台：</span>
        <span :title="systemInfo.osInfo.platform">{{ systemInfo.osInfo.platform }}</span>
      </div>
      <div class="info-item">
        <span>版本：</span>
        <span :title="systemInfo.osInfo.release">{{ systemInfo.osInfo.release }}</span>
      </div>
      <div class="info-item">
        <span>架构：</span>
        <span :title="systemInfo.osInfo.arch">{{ systemInfo.osInfo.arch }}</span>
      </div>
    </div>

    <div class="monitor-section">
      <h3>CPU信息</h3>
      <div class="info-item">
        <span>型号：</span>
        <span :title="systemInfo.cpuInfo.model">{{ systemInfo.cpuInfo.model }}</span>
      </div>
      <div class="info-item">
        <span>核心数：</span>
        <span>{{ systemInfo.cpuInfo.cores }}</span>
      </div>
      <div class="info-item">
        <span>使用率：</span>
        <div class="progress-bar">
          <div
            class="progress"
            :style="cpuProgressStyle"
          ></div>
          <span class="progress-text">{{ systemInfo.cpuInfo.usage }}%</span>
        </div>
      </div>
    </div>

    <div class="monitor-section">
      <h3>内存信息</h3>
      <div class="info-item">
        <span>总内存：</span>
        <span>{{ formatBytes(systemInfo.memoryInfo.total) }}</span>
      </div>
      <div class="info-item">
        <span>已用内存：</span>
        <span>{{ formatBytes(systemInfo.memoryInfo.used) }}</span>
      </div>
      <div class="info-item">
        <span>使用率：</span>
        <div class="progress-bar">
          <div
            class="progress"
            :style="memoryProgressStyle"
          ></div>
          <span class="progress-text">{{ systemInfo.memoryInfo.usedPercentage }}%</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.system-monitor {
  padding: 8px 4px 8px 0;
  color: var(--text-color);
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
  overflow-y: auto;
  max-height: 100%;
  overflow-x: hidden;
}

/* 添加迷你监控样式 */
.right-sidebar-collapsed .system-monitor {
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  width: 40px;
  box-sizing: border-box;
}

.right-sidebar-collapsed .monitor-section {
  display: none;
}

/* 迷你进度条容器 */
.mini-monitor {
  display: none;
  width: 100%;
  height: auto;
  margin: 0;
  padding: 8px 0;
  flex-direction: column;
  gap: 12px;
  align-items: center;
}

.right-sidebar-collapsed .mini-monitor {
  display: flex;
  height: auto;
  padding: 12px 0;
  gap: 20px;
}

/* 迷你进度条样式 */
.mini-progress {
  width: 28px;
  height: 60px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  position: relative;
  overflow: hidden;
  cursor: help;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
}

/* 折叠状态下优化mini-progress样式 */
.right-sidebar-collapsed .mini-progress {
  width: 32px;
  height: 80px;
  border-radius: 16px;
  box-shadow: 
    inset 0 2px 4px rgba(0, 0, 0, 0.3),
    0 2px 4px rgba(0, 0, 0, 0.1);
}

.mini-progress::before {
  content: attr(data-type);
  position: absolute;
  top: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  z-index: 2;
  letter-spacing: 0;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 2px;
  border-radius: 3px;
  white-space: nowrap;
}

/* 折叠状态下优化标签样式 */
.right-sidebar-collapsed .mini-progress::before {
  top: 6px;
  font-size: 10px;
  padding: 2px 4px;
  font-weight: 600;
}

.mini-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  transition: height 0.3s ease;
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.3) inset,
    0 -1px 0 rgba(0, 0, 0, 0.1) inset;
}

/* 折叠状态下优化进度条样式 */
.right-sidebar-collapsed .mini-progress-bar {
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.4) inset,
    0 -1px 0 rgba(0, 0, 0, 0.2) inset;
}

.mini-progress-text {
  position: absolute;
  left: 50%;
  bottom: 4px;
  transform: translateX(-50%);
  color: white;
  font-size: 10px;
  font-weight: 400;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.5);
  z-index: 1;
  white-space: nowrap;
  letter-spacing: -0.5px;
  background: rgba(0, 0, 0, 0.3);
  padding: 1px 3px;
  border-radius: 4px;
}

/* 折叠状态下优化文本样式 */
.right-sidebar-collapsed .mini-progress-text {
  bottom: 6px;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 6px;
  letter-spacing: 0;
  font-weight: 500;
}

.mini-progress.cpu {
  --progress-color: #4CAF50;
  --progress-gradient: linear-gradient(180deg, 
    color-mix(in srgb, var(--progress-color) 90%, white) 0%,
    var(--progress-color) 50%,
    color-mix(in srgb, var(--progress-color) 90%, black) 100%
  );
}

.mini-progress.memory {
  --progress-color: #2196F3;
  --progress-gradient: linear-gradient(180deg,
    color-mix(in srgb, var(--progress-color) 90%, white) 0%,
    var(--progress-color) 50%,
    color-mix(in srgb, var(--progress-color) 90%, black) 100%
  );
}

.monitor-section {
  margin-bottom: 8px;
  margin-left: 0;
  margin-right: 0;
  background: var(--section-bg-color);
  padding: 5px 10px;
  border-radius: 8px;
  box-shadow: var(--section-shadow);
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
}

.monitor-section:last-child {
  margin-bottom: 0;
}

.monitor-section h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  min-width: 0;
  width: 100%;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item > span:first-child {
  min-width: 70px;
  max-width: 70px;
  flex: 0 0 70px;
  color: var(--text-color-light);
  white-space: nowrap;
  margin-right: 0px;
}

.info-item > span:last-child {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 0px;
  margin-left: 0;
}

.info-item > span:last-child:hover {
  position: relative;
}

.info-item > span:last-child[title] {
  cursor: help;
}

.progress-bar {
  flex: 1;
  min-width: 0;
  height: 16px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.2);
}

.progress {
  height: 100%;
  transition: all 0.3s ease;
  box-shadow: 
    0 1px 0 rgba(255, 255, 255, 0.3) inset,
    0 -1px 0 rgba(0, 0, 0, 0.1) inset;
  min-width: 0;
}

.progress.warning {
  background: linear-gradient(to right, #ff4757, #ff6b81);
}

@property --progress-color {
  syntax: '<color>';
  initial-value: #4CAF50;
  inherits: false;
}

.progress {
  --progress-color: #4CAF50;
  background: linear-gradient(to right, var(--progress-color), color-mix(in srgb, var(--progress-color), white 20%));
}

.progress[style*="width: 6"] { --progress-color: #FFA726; }
.progress[style*="width: 7"] { --progress-color: #FF7043; }
.progress[style*="width: 8"] { --progress-color: #ff4757; }
.progress[style*="width: 9"] { --progress-color: #ff4757; }

.progress-text {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 11px;
  color: white;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
  font-weight: 500;
  white-space: nowrap;
  min-width: 35px;
  text-align: right;
}

:root {
  --text-color: #333;
  --text-color-light: #666;
  --section-bg-color: rgba(0, 0, 0, 0.05);
  --section-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.1);
}

:root .dark-theme {
  --text-color: #fff;
  --text-color-light: #aaa;
  --section-bg-color: rgba(255, 255, 255, 0.05);
  --section-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
}

/* 滚动条样式已移至全局CSS */
/* 组件特定的溢出处理 */
.system-monitor {
  overflow-y: auto;
  max-height: 100%;
  overflow-x: hidden;
}

/* 折叠状态下的布局调整 */
.right-sidebar-collapsed .system-monitor {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0;
}
</style> 