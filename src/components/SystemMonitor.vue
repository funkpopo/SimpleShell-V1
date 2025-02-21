<template>
  <div class="system-monitor-container">
    <!-- 上半部分：系统监控 -->
    <div class="monitor-section" ref="monitorSection">
      <!-- CPU使用率 -->
      <div class="monitor-item">
        <div class="section-header">
          <el-icon><Monitor /></el-icon>
          <span>CPU使用率</span>
        </div>
        <div class="content-wrapper">
          <div class="cpu-usage">
            <div v-for="(core, index) in cpuUsage" :key="index" class="cpu-core">
              <div class="core-label" :style="{ fontSize: progressStyle.fontSize + 'px' }">核心 {{ index + 1 }}</div>
              <el-progress
                :percentage="core"
                :color="getProgressColor(core)"
                :show-text="false"
                :stroke-width="progressStyle.strokeWidth"
              />
              <span class="usage-text" :style="{ fontSize: progressStyle.fontSize + 'px' }">{{ core }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 内存使用率 -->
      <div class="monitor-item">
        <div class="section-header">
          <el-icon><Cpu /></el-icon>
          <span>内存使用率</span>
        </div>
        <div class="content-wrapper">
          <div class="memory-wrapper">
            <el-progress
              :percentage="memoryUsage"
              :color="getProgressColor(memoryUsage)"
              :format="(percentage: number) => `${percentage}% (${usedMemory}GB/${totalMemory}GB)`"
              :stroke-width="progressStyle.memoryStrokeWidth"
            />
          </div>
        </div>
      </div>

      <!-- 网络状态 -->
      <div class="monitor-item">
        <div class="section-header">
          <el-icon><Connection /></el-icon>
          <span>网络状态</span>
        </div>
        <div class="content-wrapper">
          <div class="network-stats">
            <div class="stat-item">
              <span class="label" :style="{ fontSize: progressStyle.fontSize + 'px' }">上传:</span>
              <span class="value" :style="{ fontSize: progressStyle.fontSize + 'px' }">{{ uploadSpeed }} KB/s</span>
            </div>
            <div class="stat-item">
              <span class="label" :style="{ fontSize: progressStyle.fontSize + 'px' }">下载:</span>
              <span class="value" :style="{ fontSize: progressStyle.fontSize + 'px' }">{{ downloadSpeed }} KB/s</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="resizer" @mousedown="startResize"></div>

    <!-- 下半部分：连接管理 -->
    <div class="connections-section" ref="connectionsSection">
      <Connections />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue'
import Connections from './Connections.vue'

export default defineComponent({
  name: 'SystemMonitor',
  components: {
    Connections
  },
  setup() {
    const cpuUsage = ref([45, 30, 65, 25])
    const memoryUsage = ref(60)
    const totalMemory = ref(16)
    const usedMemory = ref(9.6)
    const uploadSpeed = ref(128)
    const downloadSpeed = ref(256)
    const connectionsSection = ref<HTMLElement | null>(null)
    const monitorSection = ref<HTMLElement | null>(null)
    
    // 进度条样式
    const progressStyle = ref({
      strokeWidth: 8,
      memoryStrokeWidth: 15,
      fontSize: 12
    })

    const getProgressColor = (percentage: number) => {
      if (percentage < 60) return '#67C23A'
      if (percentage < 80) return '#E6A23C'
      return '#F56C6C'
    }

    // 处理上下分割调整
    let isResizing = false
    let startY = 0
    let startHeight = 0

    const startResize = (e: MouseEvent) => {
      isResizing = true
      startY = e.clientY
      startHeight = connectionsSection.value?.clientHeight || 0
      
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', stopResize)
      document.body.style.userSelect = 'none'
      e.preventDefault()
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !connectionsSection.value) return

      const containerHeight = connectionsSection.value.parentElement?.clientHeight || 0
      const minHeight = 100
      const maxHeight = containerHeight - 200
      
      const delta = startY - e.clientY
      const newHeight = Math.min(Math.max(startHeight + delta, minHeight), maxHeight)
      
      connectionsSection.value.style.height = `${newHeight}px`
    }

    const stopResize = () => {
      isResizing = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResize)
      document.body.style.userSelect = 'auto'
    }

    // 监听monitor-section尺寸变化
    const updateProgressStyle = (height: number) => {
      const baseHeight = 500 // 基准高度
      const scale = Math.min(Math.max(height / baseHeight, 0.6), 1.2) // 限制缩放范围在0.6-1.2之间
      
      progressStyle.value = {
        strokeWidth: Math.max(Math.floor(8 * scale), 4),
        memoryStrokeWidth: Math.max(Math.floor(15 * scale), 8),
        fontSize: Math.max(Math.floor(12 * scale), 10)
      }
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
      // 设置初始连接区域高度
      if (connectionsSection.value) {
        connectionsSection.value.style.height = '300px'
      }

      // 创建ResizeObserver监听monitor-section尺寸变化
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const height = entry.contentRect.height
          updateProgressStyle(height)
        }
      })

      if (monitorSection.value) {
        resizeObserver.observe(monitorSection.value)
      }

      // 初始化数据更新定时器
      timer = window.setInterval(updateStats, 2000)
    })

    onUnmounted(() => {
      clearInterval(timer)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', stopResize)
    })

    return {
      cpuUsage,
      memoryUsage,
      totalMemory,
      usedMemory,
      uploadSpeed,
      downloadSpeed,
      getProgressColor,
      connectionsSection,
      monitorSection,
      progressStyle,
      startResize
    }
  }
})
</script>

<style lang="scss" scoped>
.system-monitor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  position: relative;

  .monitor-section {
    flex: 1;
    min-height: 200px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 20px;
    transition: all 0.2s ease;

    .monitor-item {
      background-color: #2c2c2c;
      border-radius: 8px;
      padding: 15px;
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden; /* 确保内容不会溢出 */

      .section-header {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
        font-size: 14px;
        flex-shrink: 0;

        .el-icon {
          margin-right: 8px;
          font-size: 20px;
        }
      }

      .content-wrapper {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        min-height: 0;
        padding-right: 4px; /* 为滚动条预留空间 */

        /* 自定义滚动条样式 */
        &::-webkit-scrollbar {
          width: 4px;
        }

        &::-webkit-scrollbar-track {
          background: transparent;
        }

        &::-webkit-scrollbar-thumb {
          background-color: #666;
          border-radius: 2px;
          
          &:hover {
            background-color: #888;
          }
        }
      }

      .cpu-usage {
        padding: 5px 0;
        display: flex;
        flex-direction: column;
        gap: 10px;

        .cpu-core {
          display: flex;
          align-items: center;
          
          .core-label {
            width: 80px;
            font-size: 14px;
            flex-shrink: 0;
          }

          .el-progress {
            flex: 1;
            margin: 0 10px;
          }

          .usage-text {
            width: 45px;
            text-align: right;
            font-size: 14px;
            flex-shrink: 0;
          }
        }
      }

      .memory-wrapper {
        padding: 10px 0;
      }

      .network-stats {
        padding: 5px 0;
        display: flex;
        flex-direction: column;
        gap: 10px;

        .stat-item {
          display: flex;
          justify-content: space-between;
          font-size: 14px;

          .label {
            color: #909399;
          }
        }
      }
    }
  }

  .resizer {
    height: 4px;
    background-color: #333;
    cursor: row-resize;
    position: relative;
    flex-shrink: 0;

    &:hover {
      background-color: #409eff;
    }

    &::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 30px;
      height: 2px;
      background-color: #fff;
    }
  }

  .connections-section {
    height: 300px;
    min-height: 100px;
    border-top: 1px solid #333;
    overflow: hidden;
  }
}

:deep(.el-progress-bar__inner) {
  transition: all 0.3s ease;
}

:deep(.el-progress__text) {
  color: #fff;
  transition: font-size 0.2s ease;
}

:deep(.el-progress) {
  margin-bottom: 0;
  transition: all 0.2s ease;
}
</style> 