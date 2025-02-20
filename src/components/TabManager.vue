<template>
  <div class="tab-container">
    <a-tabs
      :active-key="activeTab"
      type="card-gutter"
      @tab-click="handleTabClick"
      editable
      @add="handleAdd"
      @delete="handleDelete"
    >
      <a-tab-pane
        v-for="tab in tabs"
        :key="tab.id"
        :title="tab.title"
        :closable="tabs.length > 1"
      >
        <SshTerminal
          :config="tab.config"
          :active="activeTab === tab.id" 
          @status-change="(status: 'connecting' | 'connected' | 'disconnected' | 'error') => handleStatusChange(tab.id, status)"
        />
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted, onUnmounted, PropType } from 'vue'
import { Message } from '@arco-design/web-vue'
import { v4 as uuidv4 } from 'uuid'
import SshTerminal from './SshTerminal.vue'
import type { SSHConfig } from '../services/ConfigService'
import { sessionService, SessionData } from '../services/SessionService'

interface Tab {
  id: string
  title: string
  config: SSHConfig
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export default defineComponent({
  name: 'TabManager',
  components: {
    SshTerminal
  },
  props: {
    initialConfig: {
      type: Object as PropType<SSHConfig>,
      required: true
    }
  },
  setup(props: { initialConfig: SSHConfig }, { emit }) {
    const tabs = ref<Tab[]>([])
    const activeTab = ref('')

    // 恢复上次的会话
    const restoreSessions = async () => {
      const sessions = await sessionService.getSessions()
      sessions.forEach(session => {
        tabs.value.push({
          id: session.id,
          title: session.title,
          config: session.config,
          status: 'disconnected'
        })
      })
      if (sessions.length > 0) {
        activeTab.value = sessions[0].id
      }
    }

    // 保存当前会话
    const saveSessions = async () => {
      const sessions: SessionData[] = tabs.value.map(tab => ({
        id: tab.id,
        config: tab.config,
        title: tab.title,
        createdAt: Date.now(),
        lastActiveAt: Date.now()
      }))
      await sessionService.saveSessions(sessions)
    }

    const createTab = (config: SSHConfig) => {
      const id = uuidv4()
      tabs.value.push({
        id,
        title: `${config.name} (连接中...)`,
        config,
        status: 'connecting'
      })
      activeTab.value = id
      saveSessions()
    }

    const handleTabClick = (key: string) => {
      activeTab.value = key
    }

    const handleAdd = () => {
      // 触发添加连接的事件
      emit('add-connection')
    }

    const handleDelete = async (key: string) => {
      const index = tabs.value.findIndex(tab => tab.id === key)
      if (index !== -1) {
        tabs.value.splice(index, 1)
        if (activeTab.value === key) {
          activeTab.value = tabs.value[Math.max(0, index - 1)]?.id || ''
        }
        await saveSessions()
      }
    }

    const handleStatusChange = async (id: string, status: Tab['status']) => {
      const tab = tabs.value.find(t => t.id === id)
      if (tab) {
        tab.status = status
        tab.title = `${tab.config.name} ${status === 'connected' ? '' : `(${status})`}`
        
        if (status === 'error') {
          Message.error(`连接失败: ${tab.config.name}`)
        }
        await saveSessions()
      }
    }

    // 监听初始配置变化,创建新标签
    watch(() => props.initialConfig, (config) => {
      if (config) {
        createTab(config)
      }
    }, { immediate: true })

    onMounted(async () => {
      await restoreSessions()
    })

    onUnmounted(async () => {
      await saveSessions()
    })

    return {
      tabs,
      activeTab,
      handleTabClick,
      handleAdd,
      handleDelete,
      handleStatusChange
    }
  }
})
</script>

<style scoped>
.tab-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.arco-tabs-content) {
  flex: 1;
  height: 0;
}

:deep(.arco-tab-pane) {
  height: 100%;
}
</style> 