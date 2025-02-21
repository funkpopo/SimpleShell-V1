<template>
  <div class="system-monitor">
    <div class="monitor-section">
      <h3>系统</h3>
      <div class="system-info">
        <span>Ubuntu</span>
        <span>20.04.5 LTS</span>
      </div>
    </div>
    
    <div class="monitor-section">
      <h3>CPU</h3>
      <div class="cpu-bars">
        <div v-for="(usage, index) in cpuUsage" 
             :key="index"
             class="cpu-bar">
          <div class="bar-fill" :style="{width: usage + '%'}"></div>
          <span>{{ usage }}%</span>
        </div>
      </div>
    </div>
    
    <div class="monitor-section">
      <h3>内存</h3>
      <el-progress type="circle" 
                   :percentage="memoryUsage"
                   :stroke-width="8"
                   :show-text="false">
      </el-progress>
      <div class="memory-details">
        <div>已使用: 1.5G</div>
        <div>可用: 2.5G</div>
      </div>
    </div>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'

export default defineComponent({
  name: 'SystemMonitor',
  setup() {
    const cpuUsage = ref([45, 40, 35, 55])
    const memoryUsage = ref(75)

    const updateMetrics = () => {
      // 更新系统指标
    }

    onMounted(() => {
      setInterval(updateMetrics, 2000)
    })

    return {
      cpuUsage,
      memoryUsage
    }
  }
})
</script>

<style scoped>
.system-monitor {
  padding: 15px;
}

.monitor-section {
  margin-bottom: 20px;
}

.cpu-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cpu-bar {
  height: 20px;
  background: #333;
  border-radius: 4px;
  overflow: hidden;
  position: relative;
}

.bar-fill {
  height: 100%;
  background: #42b983;
  transition: width 0.3s ease;
}

.memory-details {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
}
</style> 