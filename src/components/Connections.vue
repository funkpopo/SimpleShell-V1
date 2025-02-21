<template>
  <div class="connections-container">
    <div class="section-header">
      <el-icon><Connection /></el-icon>
      <span>连接管理</span>
    </div>
    
    <!-- 连接分组 -->
    <div 
      class="connections-section"
      @contextmenu.prevent="handleContextMenu"
    >
      <el-collapse v-model="activeGroups">
        <el-collapse-item 
          v-for="group in connectionGroups" 
          :key="group.id" 
          :title="group.name"
          :name="group.id"
          @contextmenu.prevent="handleGroupContextMenu($event, group)"
        >
          <!-- 连接列表 -->
          <div class="connection-list">
            <div 
              v-for="conn in group.connections" 
              :key="conn.id" 
              class="connection-item"
              @click="handleConnect(conn)"
            >
              <el-icon><TerminalFilled /></el-icon>
              <span class="connection-name">{{ conn.name }}</span>
              <div class="connection-actions">
                <el-icon @click.stop="editConnection(conn)"><Edit /></el-icon>
                <el-icon @click.stop="deleteConnection(conn)"><Delete /></el-icon>
              </div>
            </div>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 右键菜单 -->
    <div 
      class="context-menu"
      v-show="contextMenuVisible"
      :style="contextMenuStyle"
    >
      <template v-if="currentContextType === 'blank'">
        <div class="menu-item" @click="handleAddGroup">
          <el-icon><FolderAdd /></el-icon>
          <span>添加分组</span>
        </div>
        <div class="menu-item" @click="handleAddConnection">
          <el-icon><Plus /></el-icon>
          <span>添加连接</span>
        </div>
      </template>
      <template v-else-if="currentContextType === 'group'">
        <div class="menu-item" @click="handleEditGroup">
          <el-icon><Edit /></el-icon>
          <span>编辑分组信息</span>
        </div>
        <div class="menu-item" @click="handleDeleteGroup">
          <el-icon><Delete /></el-icon>
          <span>删除分组</span>
        </div>
      </template>
    </div>

    <!-- 添加分组对话框 -->
    <el-dialog
      v-model="addGroupDialogVisible"
      title="添加分组"
      width="30%"
    >
      <el-form :model="newGroup" label-width="80px">
        <el-form-item label="分组名称">
          <el-input v-model="newGroup.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addGroupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addGroup">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 添加连接对话框 -->
    <el-dialog
      v-model="addConnectionDialogVisible"
      title="添加连接"
      width="40%"
    >
      <el-form :model="newConnection" label-width="80px">
        <el-form-item label="连接名称">
          <el-input v-model="newConnection.name" />
        </el-form-item>
        <el-form-item label="主机地址">
          <el-input v-model="newConnection.host" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="newConnection.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="newConnection.username" />
        </el-form-item>
        <el-form-item label="所属分组">
          <el-select v-model="newConnection.groupId">
            <el-option
              v-for="group in connectionGroups"
              :key="group.id"
              :label="group.name"
              :value="group.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="addConnectionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="addConnection">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑分组对话框 -->
    <el-dialog
      v-model="editGroupDialogVisible"
      title="编辑分组"
      width="30%"
    >
      <el-form :model="editingGroup" label-width="80px">
        <el-form-item label="分组名称">
          <el-input v-model="editingGroup.name" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editGroupDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveGroupEdit">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 编辑连接对话框 -->
    <el-dialog
      v-model="editConnectionDialogVisible"
      title="编辑连接"
      width="40%"
    >
      <el-form :model="editingConnection" label-width="80px">
        <el-form-item label="连接名称">
          <el-input v-model="editingConnection.name" />
        </el-form-item>
        <el-form-item label="主机地址">
          <el-input v-model="editingConnection.host" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="editingConnection.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="editingConnection.username" />
        </el-form-item>
        <el-form-item label="所属分组">
          <el-select v-model="editingConnection.groupId">
            <el-option
              v-for="group in connectionGroups"
              :key="group.id"
              :label="group.name"
              :value="group.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="editConnectionDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="saveConnectionEdit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { Connection, Edit, Delete, Plus, FolderAdd, Monitor } from '@element-plus/icons-vue'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'
import path from 'path'
import type { CSSProperties } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'

interface ConnectionItem {
  id: string
  name: string
  host: string
  port: number
  username: string
  groupId: string
}

interface ConnectionGroup {
  id: string
  name: string
  connections: ConnectionItem[]
}

interface ContextMenuStyle {
  position: 'fixed' | 'absolute' | 'relative'
  top: string
  left: string
}

export default defineComponent({
  name: 'Connections',
  components: {
    Connection,
    Edit,
    Delete,
    Plus,
    FolderAdd,
    TerminalFilled: Monitor
  },
  setup() {
    const activeGroups = ref<string[]>(['default'])
    const connectionGroups = ref<ConnectionGroup[]>([])
    const contextMenuVisible = ref(false)
    const dropdownPlacement = ref('bottom')
    const contextMenuStyle = ref<CSSProperties>({
      position: 'fixed',
      top: '0px',
      left: '0px'
    })

    // 对话框控制
    const addGroupDialogVisible = ref(false)
    const addConnectionDialogVisible = ref(false)

    // 新分组和新连接的数据
    const newGroup = ref({
      name: ''
    })
    const newConnection = ref({
      name: '',
      host: '',
      port: 22,
      username: '',
      groupId: ''
    })

    const currentContextType = ref<'blank' | 'group'>('blank')
    const currentContextGroup = ref<ConnectionGroup | null>(null)
    const editGroupDialogVisible = ref(false)
    const editingGroup = ref<{ id: string; name: string }>({ id: '', name: '' })
    const editConnectionDialogVisible = ref(false)
    const editingConnection = ref<ConnectionItem>({
      id: '',
      name: '',
      host: '',
      port: 22,
      username: '',
      groupId: ''
    })

    // 加载配置文件
    const loadConnections = () => {
      try {
        const configPath = path.join(process.cwd(), 'connections.json')
        if (fs.existsSync(configPath)) {
          const data = fs.readFileSync(configPath, 'utf-8')
          connectionGroups.value = JSON.parse(data)
        } else {
          // 创建默认配置
          connectionGroups.value = [{
            id: 'default',
            name: '默认分组',
            connections: []
          }]
          saveConnections()
        }
      } catch (error) {
        console.error('加载配置文件失败:', error)
      }
    }

    // 保存配置文件
    const saveConnections = () => {
      try {
        const configPath = path.join(process.cwd(), 'connections.json')
        fs.writeFileSync(configPath, JSON.stringify(connectionGroups.value, null, 2))
      } catch (error) {
        console.error('保存配置文件失败:', error)
      }
    }

    // 右键菜单处理 - 空白区域
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
      currentContextType.value = 'blank'
      currentContextGroup.value = null
      showContextMenu(event)
    }

    // 右键菜单处理 - 分组
    const handleGroupContextMenu = (event: MouseEvent, group: ConnectionGroup) => {
      event.preventDefault()
      event.stopPropagation()
      currentContextType.value = 'group'
      currentContextGroup.value = group
      showContextMenu(event)
    }

    // 显示右键菜单
    const showContextMenu = (event: MouseEvent) => {
      contextMenuStyle.value = {
        position: 'fixed',
        top: `${event.clientY}px`,
        left: `${event.clientX}px`
      } as CSSProperties

      contextMenuVisible.value = true

      // 点击其他区域关闭菜单
      const closeMenu = (e: MouseEvent) => {
        if (!e.target || !(e.target as HTMLElement).closest('.context-menu')) {
          contextMenuVisible.value = false
          document.removeEventListener('click', closeMenu)
        }
      }
      document.addEventListener('click', closeMenu)
    }

    // 编辑分组
    const handleEditGroup = () => {
      if (currentContextGroup.value) {
        editingGroup.value = {
          id: currentContextGroup.value.id,
          name: currentContextGroup.value.name
        }
        editGroupDialogVisible.value = true
        contextMenuVisible.value = false
      }
    }

    // 保存分组编辑
    const saveGroupEdit = () => {
      if (editingGroup.value.name.trim()) {
        const group = connectionGroups.value.find(g => g.id === editingGroup.value.id)
        if (group) {
          group.name = editingGroup.value.name
          saveConnections()
          editGroupDialogVisible.value = false
        }
      }
    }

    // 删除分组
    const handleDeleteGroup = () => {
      if (currentContextGroup.value) {
        ElMessageBox.confirm(
          '确定要删除该分组吗？删除后该分组下的所有连接也将被删除。',
          '警告',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          const index = connectionGroups.value.findIndex(g => g.id === currentContextGroup.value?.id)
          if (index > -1) {
            connectionGroups.value.splice(index, 1)
            saveConnections()
            ElMessage.success('删除成功')
          }
        }).catch(() => {})
        contextMenuVisible.value = false
      }
    }

    // 处理添加分组
    const handleAddGroup = () => {
      contextMenuVisible.value = false
      showAddGroupDialog()
    }

    // 处理添加连接
    const handleAddConnection = () => {
      contextMenuVisible.value = false
      showAddConnectionDialog()
    }

    // 添加分组
    const showAddGroupDialog = () => {
      newGroup.value.name = ''
      addGroupDialogVisible.value = true
      contextMenuVisible.value = false
    }

    const addGroup = () => {
      if (newGroup.value.name.trim()) {
        connectionGroups.value.push({
          id: uuidv4(),
          name: newGroup.value.name,
          connections: []
        })
        saveConnections()
        addGroupDialogVisible.value = false
      }
    }

    // 添加连接
    const showAddConnectionDialog = () => {
      newConnection.value = {
        name: '',
        host: '',
        port: 22,
        username: '',
        groupId: connectionGroups.value[0].id
      }
      addConnectionDialogVisible.value = true
      contextMenuVisible.value = false
    }

    const addConnection = () => {
      if (newConnection.value.name.trim() && newConnection.value.host.trim()) {
        const group = connectionGroups.value.find(g => g.id === newConnection.value.groupId)
        if (group) {
          group.connections.push({
            id: uuidv4(),
            ...newConnection.value
          })
          saveConnections()
          addConnectionDialogVisible.value = false
        }
      }
    }

    const handleConnect = (conn: ConnectionItem) => {
      // TODO: 实现连接逻辑
      console.log('连接到:', conn)
    }

    const editConnection = (conn: ConnectionItem) => {
      editingConnection.value = { ...conn }
      editConnectionDialogVisible.value = true
    }

    const saveConnectionEdit = () => {
      if (editingConnection.value.name.trim() && editingConnection.value.host.trim()) {
        // 查找当前连接所在的原分组
        const oldGroup = connectionGroups.value.find(g => 
          g.connections.some(c => c.id === editingConnection.value.id)
        )
        const newGroup = connectionGroups.value.find(g => g.id === editingConnection.value.groupId)
        
        if (oldGroup && newGroup) {
          // 从原分组中删除
          const index = oldGroup.connections.findIndex(c => c.id === editingConnection.value.id)
          if (index > -1) {
            oldGroup.connections.splice(index, 1)
          }
          
          // 添加到新分组（如果是同一个分组，相当于更新）
          newGroup.connections.push({ ...editingConnection.value })
          
          saveConnections()
          editConnectionDialogVisible.value = false
          ElMessage.success('保存成功')
        }
      }
    }

    const deleteConnection = (conn: ConnectionItem) => {
      ElMessageBox.confirm(
        '确定要删除该连接吗？',
        '警告',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        const group = connectionGroups.value.find(g => g.id === conn.groupId)
        if (group) {
          const index = group.connections.findIndex(c => c.id === conn.id)
          if (index > -1) {
            group.connections.splice(index, 1)
            saveConnections()
            ElMessage.success('删除成功')
          }
        }
      }).catch(() => {})
    }

    onMounted(() => {
      loadConnections()
    })

    return {
      activeGroups,
      connectionGroups,
      contextMenuVisible,
      dropdownPlacement,
      contextMenuStyle,
      addGroupDialogVisible,
      addConnectionDialogVisible,
      newGroup,
      newConnection,
      currentContextType,
      currentContextGroup,
      editGroupDialogVisible,
      editingGroup,
      editConnectionDialogVisible,
      editingConnection,
      handleContextMenu,
      handleGroupContextMenu,
      handleEditGroup,
      handleDeleteGroup,
      saveGroupEdit,
      handleAddGroup,
      handleAddConnection,
      addGroup,
      addConnection,
      handleConnect,
      editConnection,
      saveConnectionEdit,
      deleteConnection
    }
  }
})
</script>

<style lang="scss" scoped>
.connections-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #1e1e1e;
  width: 100%;
  overflow: hidden;
  
  .section-header {
    display: flex;
    align-items: center;
    padding: 15px;
    font-size: 14px;
    border-bottom: 1px solid #333;
    
    .el-icon {
      margin-right: 8px;
      font-size: 20px;
    }
  }

  .connections-section {
    flex: 1;
    overflow-y: auto;
    width: 100%;
    box-sizing: border-box;
    
    :deep(.el-collapse) {
      width: 100%;
      border: none;
      background-color: transparent;
      
      .el-collapse-item {
        width: 100%;
        margin-bottom: 1px;
        
        .el-collapse-item__header {
          background-color: #2c2c2c;
          color: #fff;
          border: none;
          height: 45px;
          line-height: 45px;
          width: 100%;
          box-sizing: border-box;
          font-size: 14px;
          transition: all 0.3s ease;
          padding: 0 15px;
          
          &:hover {
            background-color: #363636;
          }
          
          &.is-active {
            background-color: #363636;
            border-bottom: 1px solid #409eff;
          }

          .el-collapse-item__arrow {
            margin-right: 8px;
            font-size: 12px;
            color: #909399;
            transition: transform 0.3s ease;
          }
        }
        
        .el-collapse-item__wrap {
          width: 100%;
          background-color: #1e1e1e;
          border: none;
          
          .el-collapse-item__content {
            width: 100%;
            padding: 0;
            box-sizing: border-box;
            color: #fff;
          }
        }
      }
    }
  }

  .connection-list {
    width: 100%;
    box-sizing: border-box;
    
    .connection-item {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      cursor: pointer;
      border-bottom: 1px solid #333;
      width: 100%;
      box-sizing: border-box;
      transition: background-color 0.2s ease;
      
      &:hover {
        background-color: #2c2c2c;
        
        .connection-actions {
          opacity: 1;
        }
      }
      
      .el-icon {
        margin-right: 8px;
        font-size: 16px;
        flex-shrink: 0;
        color: #909399;
      }
      
      .connection-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
        color: #e6e6e6;
        font-size: 13px;
      }
      
      .connection-actions {
        opacity: 0;
        transition: all 0.3s ease;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        
        .el-icon {
          margin: 0 4px;
          font-size: 14px;
          padding: 4px;
          border-radius: 4px;
          color: #909399;
          transition: all 0.2s ease;
          
          &:hover {
            color: #409eff;
            background-color: rgba(64, 158, 255, 0.1);
          }
        }

        .el-icon:last-child {
          margin-right: 0;
        }
      }
    }
  }
}

:deep(.el-dropdown-menu) {
  background-color: #2c2c2c;
  border: 1px solid #333;
  
  .el-dropdown-menu__item {
    color: #fff;
    display: flex;
    align-items: center;
    
    .el-icon {
      margin-right: 8px;
    }
    
    &:hover {
      background-color: #363636;
    }
  }
}

:deep(.el-dialog) {
  background-color: #2c2c2c;
  
  .el-dialog__title {
    color: #fff;
  }
  
  .el-dialog__body {
    color: #fff;
  }
  
  .el-form-item__label {
    color: #fff;
  }
}

.context-menu {
  position: fixed;
  background-color: #2c2c2c;
  border: 1px solid #333;
  border-radius: 4px;
  padding: 4px 0;
  z-index: 9999;
  min-width: 120px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.3);

  .menu-item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    color: #fff;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #363636;
    }

    .el-icon {
      margin-right: 8px;
      font-size: 16px;
    }
  }
}
</style> 