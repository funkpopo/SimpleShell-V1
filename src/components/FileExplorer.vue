<template>
  <div class="file-explorer">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button class="tool-btn" @click="showNewConnectionDialog">
        <i class="fas fa-plus"></i>
      </button>
      <button class="tool-btn" @click="refreshConnections">
        <i class="fas fa-sync"></i>
      </button>
    </div>

    <!-- 连接列表 -->
    <div class="connection-list">
      <div
        v-for="connection in connections"
        :key="connection.id"
        class="connection-item"
        :class="{ active: connection.id === activeConnection }"
        @click="selectConnection(connection)"
      >
        <div class="connection-status">
          <i
            class="fas"
            :class="{
              'fa-circle': connection.status === 'connected',
              'fa-circle-notch fa-spin': connection.status === 'connecting',
              'fa-times-circle': connection.status === 'error',
              'fa-circle-dot': connection.status === 'disconnected'
            }"
            :style="{
              color: getStatusColor(connection.status)
            }"
          ></i>
        </div>
        <span class="connection-name">{{ connection.config.name }}</span>
        <div class="connection-actions">
          <button
            class="action-btn"
            @click.stop="editConnection(connection)"
            title="编辑"
          >
            <i class="fas fa-edit"></i>
          </button>
          <button
            class="action-btn"
            @click.stop="deleteConnection(connection)"
            title="删除"
          >
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- 文件树 -->
    <div class="file-tree" v-if="activeConnection">
      <div
        v-for="(item, index) in fileList"
        :key="index"
        class="file-item"
        :class="{ 'is-folder': item.type === 'folder', 'is-expanded': item.expanded }"
        @click="toggleItem(item)"
      >
        <div class="file-item-content" :style="{ paddingLeft: item.level * 20 + 'px' }">
          <i :class="getItemIcon(item)"></i>
          <span class="item-name">{{ item.name }}</span>
          <span class="item-size" v-if="!item.isDirectory">
            {{ formatFileSize(item.size) }}
          </span>
        </div>
      </div>
    </div>

    <!-- 新建连接对话框 -->
    <new-connection-dialog
      v-model:visible="showDialog"
      :is-edit="isEdit"
      :initial-data="editingConnection"
      @close="closeDialog"
      @submit="handleConnectionSubmit"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SSHManager from '../services/SSHManager'
import NewConnectionDialog from './NewConnectionDialog.vue'

const connections = ref([])
const activeConnection = ref(null)
const fileList = ref([])
const showDialog = ref(false)
const isEdit = ref(false)
const editingConnection = ref(null)

// 加载连接列表
const loadConnections = () => {
  connections.value = Array.from(SSHManager.connections.values())
}

// 显示新建连接对话框
const showNewConnectionDialog = () => {
  isEdit.value = false
  editingConnection.value = null
  showDialog.value = true
}

// 编辑连接
const editConnection = (connection) => {
  isEdit.value = true
  editingConnection.value = connection.config
  showDialog.value = true
}

// 删除连接
const deleteConnection = async (connection) => {
  if (confirm('确定要删除这个连接吗？')) {
    await SSHManager.removeConnection(connection.id)
    loadConnections()
  }
}

// 选择连接
const selectConnection = async (connection) => {
  if (connection.status === 'disconnected') {
    try {
      connection.status = 'connecting'
      await SSHManager.connect(connection.id)
      activeConnection.value = connection.id
      loadRemoteFiles('/')
    } catch (error) {
      console.error('连接失败:', error)
      connection.status = 'error'
    }
  } else {
    activeConnection.value = connection.id
    loadRemoteFiles('/')
  }
}

// 加载远程文件列表
const loadRemoteFiles = async (path) => {
  if (!activeConnection.value) return

  try {
    const files = await SSHManager.listFiles(activeConnection.value, path)
    fileList.value = files.map(file => ({
      name: file.name,
      type: file.isDirectory ? 'folder' : 'file',
      size: file.size,
      modifyTime: file.modifyTime,
      level: path === '/' ? 0 : path.split('/').length,
      expanded: false,
      path: path + (path.endsWith('/') ? '' : '/') + file.name
    }))
  } catch (error) {
    console.error('加载文件列表失败:', error)
  }
}

// 刷新连接列表
const refreshConnections = () => {
  loadConnections()
}

// 切换文件夹展开/收起
const toggleItem = async (item) => {
  if (item.type === 'folder') {
    item.expanded = !item.expanded
    if (item.expanded) {
      await loadRemoteFiles(item.path)
    }
  }
}

// 获取状态颜色
const getStatusColor = (status) => {
  switch (status) {
    case 'connected':
      return '#23d18b'
    case 'connecting':
      return '#e5e510'
    case 'error':
      return '#cd3131'
    default:
      return '#666666'
  }
}

// 格式化文件大小
const formatFileSize = (size) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  if (size < 1024 * 1024 * 1024) return (size / (1024 * 1024)).toFixed(1) + ' MB'
  return (size / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

// 获取图标类名
const getItemIcon = (item) => {
  if (item.type === 'folder') {
    return item.expanded ? 'fas fa-folder-open' : 'fas fa-folder'
  }
  return 'fas fa-file'
}

// 处理连接提交
const handleConnectionSubmit = async (data) => {
  if (isEdit.value) {
    // TODO: 实现编辑连接逻辑
  } else {
    const id = SSHManager.addConnection(data)
    loadConnections()
  }
  showDialog.value = false
}

// 关闭对话框
const closeDialog = () => {
  showDialog.value = false
}

onMounted(() => {
  loadConnections()
})
</script>

<style scoped>
.file-explorer {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.toolbar {
  padding: 8px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
}

.tool-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background-color: transparent;
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.connection-list {
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.connection-item {
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.connection-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.connection-item.active {
  background-color: var(--active-color);
}

.connection-status {
  width: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.connection-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.connection-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
}

.connection-item:hover .connection-actions {
  opacity: 1;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.action-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.file-tree {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.file-item {
  cursor: pointer;
}

.file-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.file-item-content {
  height: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 8px;
}

.item-name {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-size {
  font-size: 12px;
  opacity: 0.7;
}

i {
  width: 16px;
  text-align: center;
  font-size: 14px;
}

.is-folder > .file-item-content i {
  color: #dcb67a;
}

.is-folder.is-expanded > .file-item-content i {
  color: #dcb67a;
}
</style> 