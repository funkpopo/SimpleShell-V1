<template>
  <div class="system-stats">
    <div class="stats-header">
      <h3>系统监控</h3>
      <span class="hostname">Ubuntu 20.04.5 LTS</span>
    </div>

    <!-- CPU使用率 -->
    <div class="stats-section">
      <div class="section-header">
        <i class="fas fa-microchip"></i>
        <span>CPU</span>
      </div>
      <div class="cpu-bars">
        <div v-for="(core, index) in cpuStats" :key="index" class="cpu-bar">
          <div class="bar-label">核心 {{ index + 1 }}</div>
          <div class="bar-container">
            <div class="bar" :style="{ width: core + '%' }"></div>
            <span class="bar-value">{{ core }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 内存使用率 -->
    <div class="stats-section">
      <div class="section-header">
        <i class="fas fa-memory"></i>
        <span>内存</span>
      </div>
      <div class="memory-chart">
        <div class="memory-bar">
          <div class="bar" :style="{ width: memoryUsage + '%' }"></div>
        </div>
        <div class="memory-stats">
          <div>已用: {{ usedMemory }}GB</div>
          <div>总计: {{ totalMemory }}GB</div>
        </div>
      </div>
    </div>

    <!-- 网络状态 -->
    <div class="stats-section">
      <div class="section-header">
        <i class="fas fa-network-wired"></i>
        <span>网络</span>
      </div>
      <div class="network-stats">
        <div class="stat-item">
          <span>上传</span>
          <span>{{ uploadSpeed }} KB/s</span>
        </div>
        <div class="stat-item">
          <span>下载</span>
          <span>{{ downloadSpeed }} KB/s</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

// 模拟CPU数据
const cpuStats = ref([45, 30, 65, 25])

// 模拟内存数据
const memoryUsage = ref(75)
const totalMemory = ref(16)
const usedMemory = ref((totalMemory.value * memoryUsage.value / 100).toFixed(1))

// 模拟网络数据
const uploadSpeed = ref(128)
const downloadSpeed = ref(256)

// 更新系统状态
const updateStats = () => {
  // 模拟CPU使用率变化
  cpuStats.value = cpuStats.value.map(() => Math.floor(Math.random() * 100))
  
  // 模拟内存使用率变化
  memoryUsage.value = Math.floor(Math.random() * 40 + 60)
  usedMemory.value = (totalMemory.value * memoryUsage.value / 100).toFixed(1)
  
  // 模拟网络速度变化
  uploadSpeed.value = Math.floor(Math.random() * 200 + 100)
  downloadSpeed.value = Math.floor(Math.random() * 400 + 200)
}

let statsInterval

onMounted(() => {
  statsInterval = setInterval(updateStats, 2000)
})

onBeforeUnmount(() => {
  clearInterval(statsInterval)
})
</script>

<style scoped>
.system-stats {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  color: var(--text-color);
}

.stats-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
}

.hostname {
  font-size: 12px;
  opacity: 0.7;
}

.stats-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.section-header i {
  width: 16px;
  text-align: center;
  opacity: 0.7;
}

.cpu-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.cpu-bar {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bar-label {
  font-size: 12px;
  opacity: 0.7;
}

.bar-container {
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  position: relative;
}

.bar {
  height: 100%;
  background-color: var(--active-color);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.bar-value {
  position: absolute;
  right: 0;
  top: -18px;
  font-size: 12px;
  opacity: 0.7;
}

.memory-chart {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.memory-bar {
  height: 6px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.memory-bar .bar {
  background-color: #23d18b;
}

.memory-stats {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  opacity: 0.7;
}

.network-stats {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.stat-item span:last-child {
  opacity: 0.7;
}
</style> 