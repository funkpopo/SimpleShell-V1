<template>
  <div class="tab-bar">
    <div
      v-for="(tab, index) in tabs"
      :key="index"
      class="tab"
      :class="{ active: tab.active }"
      @click="switchTab(index)"
    >
      <i :class="getTabIcon(tab)"></i>
      <span class="tab-title">{{ getTabTitle(tab) }}</span>
      <button class="close-btn" @click.stop="closeTab(index)">
        <i class="fas fa-times"></i>
      </button>
    </div>
    <button class="new-tab-btn" @click="addNewTab">
      <i class="fas fa-plus"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, defineEmits } from 'vue'
import SSHManager from '../services/SSHManager'

const emit = defineEmits(['change'])

// 标签页数据
const tabs = ref([
  {
    type: 'local',
    title: '本地终端',
    active: true
  }
])

// 获取标签页图标
const getTabIcon = (tab) => {
  if (tab.type === 'local') {
    return 'fas fa-terminal'
  }
  return tab.status === 'connected'
    ? 'fas fa-network-wired'
    : 'fas fa-exclamation-circle'
}

// 获取标签页标题
const getTabTitle = (tab) => {
  if (tab.type === 'local') {
    return tab.title
  }
  const connection = SSHManager.connections.get(tab.connectionId)
  return connection ? connection.config.name : 'SSH连接'
}

// 切换标签页
const switchTab = (index) => {
  tabs.value.forEach((tab, i) => {
    tab.active = i === index
  })
  const activeTab = tabs.value[index]
  emit('change', {
    type: activeTab.type,
    connectionId: activeTab.connectionId
  })
}

// 关闭标签页
const closeTab = (index) => {
  const tab = tabs.value[index]
  if (tab.type === 'ssh') {
    SSHManager.disconnect(tab.connectionId)
  }
  tabs.value = tabs.value.filter((_, i) => i !== index)
  if (tabs.value.length && !tabs.value.some(tab => tab.active)) {
    tabs.value[0].active = true
    const activeTab = tabs.value[0]
    emit('change', {
      type: activeTab.type,
      connectionId: activeTab.connectionId
    })
  }
}

// 添加新标签页
const addNewTab = () => {
  tabs.value.push({
    type: 'local',
    title: '新终端',
    active: false
  })
  switchTab(tabs.value.length - 1)
}

// 添加SSH标签页
const addSSHTab = (connectionId) => {
  const connection = SSHManager.connections.get(connectionId)
  if (!connection) return

  // 检查是否已存在相同连接的标签页
  const existingIndex = tabs.value.findIndex(tab => 
    tab.type === 'ssh' && tab.connectionId === connectionId
  )

  if (existingIndex !== -1) {
    switchTab(existingIndex)
    return
  }

  tabs.value.push({
    type: 'ssh',
    connectionId,
    status: connection.status,
    active: false
  })
  switchTab(tabs.value.length - 1)
}

// 更新SSH标签页状态
const updateSSHTabStatus = (connectionId, status) => {
  const tab = tabs.value.find(tab => 
    tab.type === 'ssh' && tab.connectionId === connectionId
  )
  if (tab) {
    tab.status = status
  }
}

defineExpose({
  addSSHTab,
  updateSSHTabStatus
})
</script>

<style scoped>
.tab-bar {
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 2px;
  background-color: var(--secondary-bg);
}

.tab {
  height: 100%;
  padding: 0 8px;
  min-width: 120px;
  max-width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--primary-bg);
  border-right: 1px solid var(--border-color);
  cursor: pointer;
  user-select: none;
}

.tab.active {
  background-color: var(--primary-bg);
  border-bottom: 2px solid var(--active-color);
}

.tab:hover:not(.active) {
  background-color: rgba(255, 255, 255, 0.1);
}

.tab-title {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.close-btn {
  width: 16px;
  height: 16px;
  border: none;
  background: transparent;
  color: var(--text-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.6;
  border-radius: 3px;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  opacity: 1;
}

.new-tab-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.new-tab-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

i {
  font-size: 12px;
}
</style> 