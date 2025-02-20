<template>
  <a-modal
    :visible="visible"
    title="连接记录"
    @cancel="handleCancel"
    width="800px"
  >
    <a-table
      :data="records"
      :pagination="{ pageSize: 10 }"
      :loading="loading"
    >
      <template #columns>
        <a-table-column title="连接名称" data-index="configName" />
        <a-table-column title="时间" data-index="timestamp">
          <template #cell="{ record }">
            {{ formatTime(record.timestamp) }}
          </template>
        </a-table-column>
        <a-table-column title="持续时间" data-index="duration">
          <template #cell="{ record }">
            {{ formatDuration(record.duration) }}
          </template>
        </a-table-column>
        <a-table-column title="状态" data-index="status">
          <template #cell="{ record }">
            <a-tag :color="record.status === 'success' ? 'green' : 'red'">
              {{ record.status === 'success' ? '成功' : '失败' }}
            </a-tag>
          </template>
        </a-table-column>
        <a-table-column title="错误信息" data-index="error" />
      </template>
    </a-table>

    <template #footer>
      <a-space>
        <a-button @click="handleClear" type="text" status="danger">
          清空记录
        </a-button>
        <a-button @click="handleCancel">关闭</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, watch } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { connectionHistoryService } from '@/services/ConnectionHistoryService'
import { configService } from '@/services/ConfigService'

export default defineComponent({
  name: 'ConnectionHistoryDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:visible'],
  setup(props, { emit }) {
    const loading = ref(false)
    const records = ref([])

    const loadRecords = async () => {
      loading.value = true
      try {
        const rawRecords = await connectionHistoryService.getRecords()
        const configs = await configService.getAllConnections()
        
        records.value = rawRecords.map(record => {
          const config = configs.find(c => c.id === record.configId)
          return {
            ...record,
            configName: config?.name || '已删除的连接'
          }
        })
      } catch (err) {
        Message.error('加载记录失败')
      } finally {
        loading.value = false
      }
    }

    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleString()
    }

    const formatDuration = (duration: number) => {
      if (duration < 60) {
        return `${duration}秒`
      }
      const minutes = Math.floor(duration / 60)
      const seconds = duration % 60
      return `${minutes}分${seconds}秒`
    }

    const handleCancel = () => {
      emit('update:visible', false)
    }

    const handleClear = () => {
      Modal.confirm({
        title: '确认清空',
        content: '确定要清空所有连接记录吗？此操作不可恢复。',
        async onOk() {
          await connectionHistoryService.clearRecords()
          await loadRecords()
          Message.success('记录已清空')
        }
      })
    }

    watch(() => props.visible, async (visible) => {
      if (visible) {
        await loadRecords()
      }
    })

    onMounted(async () => {
      if (props.visible) {
        await loadRecords()
      }
    })

    return {
      loading,
      records,
      handleCancel,
      handleClear,
      formatTime,
      formatDuration
    }
  }
})
</script> 