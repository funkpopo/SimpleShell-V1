<template>
  <div class="connection-status">
    <a-space>
      <a-tag :color="statusColor">
        {{ statusText }}
      </a-tag>
      <template v-if="status === 'connected'">
        <span class="latency" :class="latencyClass">
          {{ latencyText }}
        </span>
        <span class="uptime">
          {{ uptimeText }}
        </span>
      </template>
    </a-space>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import type { ConnectionStatus } from '@/services/ConnectionMonitorService'

export default defineComponent({
  name: 'ConnectionStatus',
  props: {
    status: {
      type: String as PropType<ConnectionStatus['status']>,
      required: true
    },
    latency: {
      type: Number,
      default: 0
    },
    startTime: {
      type: Number,
      default: 0
    }
  },
  setup(props) {
    const statusColor = computed(() => {
      switch (props.status) {
        case 'connected': return 'green'
        case 'connecting': return 'blue'
        case 'disconnected': return 'gray'
        case 'error': return 'red'
        default: return 'default'
      }
    })

    const statusText = computed(() => {
      switch (props.status) {
        case 'connected': return '已连接'
        case 'connecting': return '连接中'
        case 'disconnected': return '已断开'
        case 'error': return '错误'
        default: return '未知'
      }
    })

    const latencyClass = computed(() => {
      if (props.latency < 100) return 'good'
      if (props.latency < 300) return 'normal'
      return 'bad'
    })

    const latencyText = computed(() => {
      return `${props.latency}ms`
    })

    const uptimeText = computed(() => {
      if (!props.startTime) return ''
      const seconds = Math.floor((Date.now() - props.startTime) / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      const days = Math.floor(hours / 24)

      if (days > 0) return `${days}天`
      if (hours > 0) return `${hours}小时`
      if (minutes > 0) return `${minutes}分钟`
      return `${seconds}秒`
    })

    return {
      statusColor,
      statusText,
      latencyClass,
      latencyText,
      uptimeText
    }
  }
})
</script>

<style scoped>
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.latency {
  font-family: monospace;
}

.latency.good {
  color: #52c41a;
}

.latency.normal {
  color: #faad14;
}

.latency.bad {
  color: #ff4d4f;
}

.uptime {
  color: #8c8c8c;
  font-size: 12px;
}
</style> 