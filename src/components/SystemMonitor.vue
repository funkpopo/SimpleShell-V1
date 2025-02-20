<template>
  <div class="system-monitor-container">
    <!-- CPU使用率 -->
    <div class="monitor-section">
      <div class="section-header">
        <el-icon><Monitor /></el-icon>
        <span>CPU使用率</span>
      </div>
      <div class="cpu-usage">
        <div v-for="(core, index) in cpuUsage" :key="index" class="cpu-core">
          <div class="core-label">核心 {{ index + 1 }}</div>
          <el-progress
            :percentage="core"
            :color="getProgressColor(core)"
            :show-text="false"
            :stroke-width="8"
          />
          <span class="usage-text">{{ core }}%</span>
        </div>
      </div>
    </div>

    <!-- 内存使用率 -->
    <div class="monitor-section">
      <div class="section-header">
        <el-icon><Cpu /></el-icon>
        <span>内存使用率</span>
      </div>
      <el-progress
        :percentage="memoryUsage"
        :color="getProgressColor(memoryUsage)"
        :format="(percentage) => `${percentage}% (${usedMemory}GB/${totalMemory}GB)`"
        :stroke-width="15"
      />
    </div>

    <!-- 网络状态 -->
    <div class="monitor-section">
      <div class="section-header">
        <el-icon><Connection /></el-icon>
        <span>网络状态</span>
      </div>
      <div class="network-stats">
        <div class="stat-item">
          <span class="label">上传:</span>
          <span class="value">{{ uploadSpeed }} KB/s</span>
        </div>
        <div class="stat-item">
          <span class="label">下载:</span>
          <span class="value">{{ downloadSpeed }} KB/s</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'

export default defineComponent({
  name: 'SystemMonitor',
  setup() {
    const cpuUsage = ref([45, 30, 65, 25])
    const memoryUsage = ref(60)
    const totalMemory = ref(16)
    const usedMemory = ref(9.6)
    const uploadSpeed = ref(128)
    const downloadSpeed = ref(256)

    const getProgressColor = (percentage: number) => {
      if (percentage < 60) return '#67C23A'
      if (percentage < 80) return '#E6A23C'
      return '#F56C6C'
    }

    // 模拟数据更新
    let timer: number
    const updateStats = () => {
      cpuUsage.value = cpuUsage.value.map(() => Math.floor(Math.random() * 100))
      memoryUsage.value = Math.floor(Math.random() * 40) + 40
      usedMemory.value = (memoryUsage.value * totalMemory.value) / 100
      uploadSpeed.value = Math.floor(Math.random() * 200) + 50
      downloadSpeed.value = Math.floor(Math.random() * 400) + 100
    }

    onMounted(() => {
      timer = window.setInterval(updateStats, 2000)
    })

    onUnmounted(() => {
      clearInterval(timer)
    })

    return {
      cpuUsage,
      memoryUsage,
      totalMemory,
      usedMemory,
      uploadSpeed,
      downloadSpeed,
      getProgressColor
    }
  }
})
</script>

<style lang="scss" scoped>
.system-monitor-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
  background-color: #1e1e1e;

  .monitor-section {
    background-color: #2c2c2c;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      font-size: 16px;

      .el-icon {
        margin-right: 8px;
        font-size: 20px;
      }
    }
  }

  .cpu-usage {
    .cpu-core {
      display: flex;
      align-items: center;
      margin-bottom: 10px;

      .core-label {
        width: 80px;
        font-size: 14px;
      }

      .el-progress {
        flex: 1;
        margin: 0 10px;
      }

      .usage-text {
        width: 45px;
        text-align: right;
        font-size: 14px;
      }
    }
  }

  .network-stats {
    .stat-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      font-size: 14px;

      .label {
        color: #909399;
      }
    }
  }
}

:deep(.el-progress-bar__inner) {
  transition: all 0.3s ease;
}

:deep(.el-progress__text) {
  color: #fff;
}
</style> 