<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import CollectionNightIcon from '../assets/collection-night.svg'
import CollectionDayIcon from '../assets/collection-day.svg'
import AddCollectionNightIcon from '../assets/plus-night.svg'
import AddCollectionDayIcon from '../assets/plus-day.svg'
import DeleteNightIcon from '../assets/delete-night.svg'
import DeleteDayIcon from '../assets/delete-day.svg'
import EditNightIcon from '../assets/edit-night.svg'
import EditDayIcon from '../assets/edit-day.svg'

// 主题状态
const isDarkTheme = ref(true)

// 菜单类型
type MenuType = 'organization' | 'connection' | 'area'

// 组织和连接项的数据结构
interface Connection {
  id: string
  name: string
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  description?: string
}

interface Organization {
  id: string
  name: string
  connections: Connection[]
}

// 组织数据
const organizations = ref<Organization[]>([
  {
    id: '1',
    name: '默认组织',
    connections: [
      {
        id: '1-1',
        name: '本地服务器',
        host: 'localhost',
        port: 22,
        username: 'root',
        description: '本地测试服务器'
      }
    ]
  }
])

// 组织展开/折叠状态
const expandedOrganizations = ref<Record<string, boolean>>({
  '1': true // 默认展开第一个组织
})

// 切换组织展开/折叠状态
const toggleOrganization = (orgId: string) => {
  expandedOrganizations.value[orgId] = !expandedOrganizations.value[orgId]
}

// 右键菜单数据
const showContextMenu = ref(false)
const menuType = ref<MenuType>('area')
const menuPosition = ref({ x: 0, y: 0 })
const selectedOrganizationId = ref<string | null>(null)
const selectedConnectionId = ref<string | null>(null)

// 编辑状态
const isEditing = ref(false)
const editingText = ref('')
const editingItemId = ref<string | null>(null)
const editingType = ref<'organization' | 'connection' | null>(null)

// 为连接生成随机颜色
const getConnectionColor = (connId: string) => {
  // 使用连接ID作为种子，确保相同ID总是得到相同颜色
  let hash = 0
  for (let i = 0; i < connId.length; i++) {
    hash = connId.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  // 生成HSL颜色，固定饱和度和亮度，只改变色相
  // 这样可以确保颜色鲜艳但不会太暗
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 70%, 60%)`
}

// 显示右键菜单
const showMenu = (e: MouseEvent, type: MenuType, orgId?: string, connId?: string) => {
  e.preventDefault()
  showContextMenu.value = true
  menuType.value = type
  
  // 获取窗口宽度和高度
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // 估计菜单宽高（可根据实际情况调整）
  const estimatedMenuWidth = 180 // 根据CSS中设置的min-width
  const estimatedMenuHeight = type === 'area' ? 40 : type === 'organization' ? 120 : 80 // 根据菜单项数量估计
  
  // 初始设置位置为鼠标位置
  let posX = e.clientX
  let posY = e.clientY
  
  // 检查右边界，如果超出则显示在鼠标左侧
  if (posX + estimatedMenuWidth > windowWidth) {
    posX = posX - estimatedMenuWidth
  }
  
  // 检查底部边界，如果超出则向上移动菜单
  if (posY + estimatedMenuHeight > windowHeight) {
    posY = posY - estimatedMenuHeight
  }
  
  // 设置调整后的位置
  menuPosition.value = { x: posX, y: posY }
  
  if (orgId) selectedOrganizationId.value = orgId
  if (connId) selectedConnectionId.value = connId

  // 添加一次性的点击事件监听，点击其他地方关闭菜单
  setTimeout(() => {
    window.addEventListener('click', closeMenu, { once: true })
    
    // 菜单渲染后进行精确调整
    nextTick(() => {
      const menuElement = document.querySelector('.context-menu') as HTMLElement
      if (menuElement) {
        const menuRect = menuElement.getBoundingClientRect()
        
        // 精确调整X坐标，确保不超出右边界
        if (menuRect.right > windowWidth) {
          menuPosition.value.x = windowWidth - menuRect.width
        }
        
        // 精确调整Y坐标，确保不超出底部边界
        if (menuRect.bottom > windowHeight) {
          menuPosition.value.y = windowHeight - menuRect.height
        }
        
        // 确保不超出左边界和上边界
        if (menuPosition.value.x < 0) menuPosition.value.x = 0
        if (menuPosition.value.y < 0) menuPosition.value.y = 0
      }
    })
  }, 0)
}

// 关闭右键菜单
const closeMenu = () => {
  showContextMenu.value = false
  if (!isEditing.value) {
    selectedOrganizationId.value = null
    selectedConnectionId.value = null
  }
}

// 新建组织
const createOrganization = () => {
  const newId = Date.now().toString()
  organizations.value.push({
    id: newId,
    name: '新组织',
    connections: []
  })
  
  // 进入编辑模式
  startEditing(newId, '新组织', 'organization')
  closeMenu()
}

// 编辑组织名称
const editOrganization = (orgId: string | null) => {
  if (!orgId) return
  const org = organizations.value.find(o => o.id === orgId)
  if (org) {
    startEditing(orgId, org.name, 'organization')
  }
  closeMenu()
}

// 创建连接
const createConnection = (orgId: string | null) => {
  if (!orgId) return
  const org = organizations.value.find(o => o.id === orgId)
  if (org) {
    const newId = `${orgId}-${Date.now()}`
    const newConnection: Connection = {
      id: newId,
      name: '新连接',
      host: '',
      port: 22,
      username: ''
    }
    org.connections.push(newConnection)
    
    // 进入编辑模式 (实际应该打开连接配置对话框)
    // 此处简化为编辑名称
    startEditing(newId, '新连接', 'connection')
  }
  closeMenu()
}

// 开始编辑
const startEditing = (id: string, text: string, type: 'organization' | 'connection') => {
  isEditing.value = true
  editingText.value = text
  editingItemId.value = id
  editingType.value = type
  
  // 在下一个事件循环中聚焦输入框
  setTimeout(() => {
    const inputEl = document.getElementById('editing-input')
    if (inputEl) {
      inputEl.focus()
    }
  }, 0)
}

// 保存编辑
const saveEditing = () => {
  if (editingType.value === 'organization') {
    const org = organizations.value.find(o => o.id === editingItemId.value)
    if (org) {
      org.name = editingText.value
    }
  } else if (editingType.value === 'connection') {
    for (const org of organizations.value) {
      const conn = org.connections.find(c => c.id === editingItemId.value)
      if (conn) {
        conn.name = editingText.value
        break
      }
    }
  }
  
  cancelEditing()
}

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false
  editingText.value = ''
  editingItemId.value = null
  editingType.value = null
}

// 处理键盘事件
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    saveEditing()
  } else if (e.key === 'Escape') {
    cancelEditing()
  }
}

// 删除组织
const deleteOrganization = (orgId: string | null) => {
  if (!orgId) return
  organizations.value = organizations.value.filter(o => o.id !== orgId)
  closeMenu()
}

// 删除连接
const deleteConnection = (orgId: string | null, connId: string | null) => {
  if (!orgId || !connId) return
  const org = organizations.value.find(o => o.id === orgId)
  if (org) {
    org.connections = org.connections.filter(c => c.id !== connId)
  }
  closeMenu()
}

// 组件挂载和卸载时的事件处理
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('click', closeMenu)
})
</script>

<template>
  <div class="connection-manager" @contextmenu="showMenu($event, 'area')">
    <h3>连接管理</h3>
    
    <div class="connection-list">
      <div 
        v-for="org in organizations" 
        :key="org.id" 
        class="organization"
      >
        <!-- 组织名称 -->
        <div 
          class="organization-header" 
          @click="toggleOrganization(org.id)"
          @contextmenu.stop="showMenu($event, 'organization', org.id)"
        >
          <div v-if="isEditing && editingItemId === org.id" class="editing-container">
            <input 
              id="editing-input"
              v-model="editingText" 
              @blur="saveEditing" 
              @keydown="handleKeyDown"
              class="editing-input"
            />
          </div>
          <div v-else class="organization-name">
            <img
              :src="isDarkTheme ? CollectionNightIcon : CollectionDayIcon"
              class="collection-icon"
            />
            {{ org.name }}
          </div>
        </div>
        
        <!-- 连接列表 -->
        <div v-show="expandedOrganizations[org.id]" class="connection-items">
          <div 
            v-for="conn in org.connections" 
            :key="conn.id"
            class="connection-item"
            @contextmenu.stop="showMenu($event, 'connection', org.id, conn.id)"
          >
            <div v-if="isEditing && editingItemId === conn.id" class="editing-container">
              <input 
                id="editing-input"
                v-model="editingText" 
                @blur="saveEditing" 
                @keydown="handleKeyDown"
                class="editing-input"
              />
            </div>
            <div v-else class="connection-name">
              <div 
                class="connection-color-block" 
                :style="{ backgroundColor: getConnectionColor(conn.id) }"
              ></div>
              {{ conn.name }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 右键菜单 -->
    <div 
      v-if="showContextMenu" 
      class="context-menu"
      :style="{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }"
    >
      <!-- 空白区域菜单 -->
      <template v-if="menuType === 'area'">
        <div class="menu-item" @click="createOrganization">
          <img
            :src="isDarkTheme ? AddCollectionNightIcon : AddCollectionDayIcon"
            class="plus-icon"
          />
          新建组织
        </div>
      </template>
      
      <!-- 组织菜单 -->
      <template v-else-if="menuType === 'organization'">
        <div class="menu-item" @click="editOrganization(selectedOrganizationId)">
          <img
            :src="isDarkTheme ? EditNightIcon : EditDayIcon"
            class="edit-icon"
          />
          编辑组织名称
        </div>
        <div class="menu-item" @click="createConnection(selectedOrganizationId)">
          <img
            :src="isDarkTheme ? AddCollectionNightIcon : AddCollectionDayIcon"
            class="plus-icon"
          />
          新建连接
        </div>
        <div class="menu-item delete" @click="deleteOrganization(selectedOrganizationId)">
          <img
            :src="isDarkTheme ? DeleteNightIcon : DeleteDayIcon"
            class="delete-icon"
          />
          删除组织
        </div>
      </template>
      
      <!-- 连接菜单 -->
      <template v-else-if="menuType === 'connection'">
        <div class="menu-item">
          <img
            :src="isDarkTheme ? EditNightIcon : EditDayIcon"
            class="edit-icon"
          />
          连接到服务器
        </div>
        <div class="menu-item delete" @click="deleteConnection(selectedOrganizationId, selectedConnectionId)">
          <img
            :src="isDarkTheme ? DeleteNightIcon : DeleteDayIcon"
            class="delete-icon"
          />
          删除连接
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
:root {
  --text-color: #333;
  --text-color-light: #666;
  --section-bg-color: rgba(0, 0, 0, 0.05);
  --section-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.1);
  --menu-bg-color: rgba(0, 0, 0, 0.05);
  --menu-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  --menu-hover-bg: rgba(0, 0, 0, 0.07);
  --delete-color: #e53935;
  --border-color: rgba(0, 0, 0, 0.15);
  --separator-color: #e0e0e0;
}

:root .dark-theme {
  --text-color: #ffffff;
  --text-color-light: #aaa;
  --section-bg-color: rgba(255, 255, 255, 0.05);
  --section-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  --menu-bg-color: rgba(255, 255, 255, 0.05);
  --menu-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  --menu-hover-bg: rgba(255, 255, 255, 0.15);
  --delete-color: #ff6b6b;
  --border-color: rgba(255, 255, 255, 0.15);
  --separator-color: #444;
}

.connection-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: auto;
  padding: 10px;
  position: relative;
  color: var(--text-color);
}

h3 {
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
}

.connection-list {
  flex: 1;
  overflow: auto;
}

.organization {
  margin-bottom: 10px;
}

.organization-header {
  display: flex;
  align-items: center;
  padding: 5px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 2px;
}

.organization-header:hover {
  background-color: var(--menu-hover-bg);
}

.organization-name {
  display: flex;
  align-items: center;
  font-weight: 500;
  color: var(--text-color);
}

.collection-icon,
.plus-icon,
.delete-icon,
.edit-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
}

.connection-items {
  margin-left: 20px;
  transition: all 0.3s ease;
}

.connection-item {
  display: flex;
  align-items: center;
  padding: 5px;
  margin-bottom: 2px;
  border-radius: 4px;
  cursor: pointer;
}

.connection-item:hover {
  background-color: var(--menu-hover-bg);
}

.connection-name {
  display: flex;
  align-items: center;
  color: var(--text-color);
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background-color: #f5f5f5;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  min-width: 180px;
  z-index: 9999;
  color: var(--text-color);
  opacity: 1 !important;
  backdrop-filter: none;
  border: 1px solid rgba(0, 0, 0, 0.2);
  overflow: hidden;
  padding: 4px 0;
  transition: top 0.1s ease, left 0.1s ease;
  max-height: 80vh; /* 防止在极端情况下菜单太长 */
  overflow-y: auto; /* 如果内容太多则显示滚动条 */
}

/* 暗色主题下的菜单样式 */
.dark-theme .context-menu {
  background-color: #222;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.menu-item {
  padding: 8px 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-color);
  transition: all 0.2s ease;
  position: relative;
  margin: 2px 4px;
  border-radius: 4px;
}

.menu-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.dark-theme .menu-item:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.menu-item svg {
  margin-right: 8px;
  fill: currentColor;
}

.menu-item:hover {
  background-color: rgba(0, 0, 0, 0.07);
}

.dark-theme .menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.menu-item.delete {
  color: var(--delete-color);
}

/* 编辑输入框 */
.editing-container {
  flex: 1;
}

.editing-input {
  width: 100%;
  background: transparent;
  border: 1px solid var(--border-color);
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 14px;
  color: var(--text-color);
}

.dark-theme .editing-input {
  background-color: rgba(30, 30, 30, 0.5);
}

/* 图标样式 */
.dark-theme .folder-icon,
.dark-theme .terminal-icon,
.dark-theme .collection-icon,
.dark-theme .plus-icon,
.dark-theme .delete-icon,
.dark-theme .edit-icon {
  opacity: 0.9;
}

/* 确保夜间模式下分隔线可见 */
.menu-separator {
  height: 1px;
  background-color: var(--separator-color);
  margin: 4px 0;
}

/* 确保夜间模式下禁用项的样式 */
.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark-theme .menu-item.disabled {
  opacity: 0.4;
}

/* 添加折叠/展开动画 */
/* 图标样式 */
.collection-open, 
.collection-close {
  transition: transform 0.3s ease;
}

.collection-open {
  transform: rotate(0deg);
}

.collection-close {
  transform: rotate(-90deg);
}

/* 连接颜色方块 */
.connection-color-block {
  width: 16px;
  height: 16px;
  border-radius: 3px;
  margin-right: 6px;
  flex-shrink: 0;
}

.dark-theme .connection-color-block {
  box-shadow: 0 0 1px rgba(255, 255, 255, 0.3);
}
</style> 