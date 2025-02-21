<template>
  <div class="connection-manager">
    <el-dialog
      v-model="dialogVisible"
      title="SSH连接管理"
      width="500px">
      
      <el-table :data="connections" style="width: 100%">
        <el-table-column prop="name" label="名称" />
        <el-table-column prop="host" label="主机" />
        <el-table-column prop="username" label="用户名" />
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button @click="editConnection(row)" type="text">编辑</el-button>
            <el-button @click="deleteConnection(row.id)" type="text">删除</el-button>
            <el-button @click="connect(row)" type="text">连接</el-button>
          </template>
        </el-table-column>
      </el-table>

      <template #footer>
        <el-button @click="dialogVisible = false">关闭</el-button>
        <el-button @click="exportConfig">导出配置</el-button>
        <el-button @click="importConfig">导入配置</el-button>
        <el-button type="primary" @click="showEditDialog()">新建连接</el-button>
      </template>
    </el-dialog>

    <!-- 编辑对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      :title="editingConnection.id ? '编辑连接' : '新建连接'"
      width="400px">
      <el-form :model="editingConnection" label-width="80px">
        <el-form-item label="名称">
          <el-input v-model="editingConnection.name" />
        </el-form-item>
        <el-form-item label="主机">
          <el-input v-model="editingConnection.host" />
        </el-form-item>
        <el-form-item label="端口">
          <el-input-number v-model="editingConnection.port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item label="用户名">
          <el-input v-model="editingConnection.username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="editingConnection.password" type="password" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveConnection">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineComponent, ref, onMounted } from 'vue'
import { useTerminalStore } from '../store'
import { ElMessage } from 'element-plus'

export default defineComponent({
  name: 'ConnectionManager',
  setup() {
    const dialogVisible = ref(false)
    const editDialogVisible = ref(false)
    const connections = ref([])
    const terminalStore = useTerminalStore()
    
    const editingConnection = ref({
      id: '',
      name: '',
      host: '',
      port: 22,
      username: '',
      password: ''
    })

    const loadConnections = async () => {
      const result = await window.electron.ipcRenderer.invoke('store:get-all-ssh')
      connections.value = result
    }

    const showEditDialog = (connection = null) => {
      if (connection) {
        editingConnection.value = { ...connection }
      } else {
        editingConnection.value = {
          id: '',
          name: '',
          host: '',
          port: 22,
          username: '',
          password: ''
        }
      }
      editDialogVisible.value = true
    }

    const saveConnection = async () => {
      if (!editingConnection.value.id) {
        editingConnection.value.id = Date.now().toString()
      }
      
      const result = await window.electron.ipcRenderer.invoke(
        'store:save-ssh',
        editingConnection.value
      )
      
      if (result.success) {
        editDialogVisible.value = false
        loadConnections()
      }
    }

    const deleteConnection = async (id) => {
      await window.electron.ipcRenderer.invoke('store:delete-ssh', id)
      loadConnections()
    }

    const connect = (config) => {
      terminalStore.addTab(config)
      dialogVisible.value = false
    }

    const exportConfig = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('config:export')
        if (result.success) {
          ElMessage.success('配置导出成功')
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        ElMessage.error('配置导出失败: ' + error.message)
      }
    }
    
    const importConfig = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('config:import')
        if (result.success) {
          ElMessage.success('配置导入成功')
          loadConnections()
        } else {
          throw new Error(result.error)
        }
      } catch (error) {
        ElMessage.error('配置导入失败: ' + error.message)
      }
    }

    onMounted(() => {
      loadConnections()
    })

    return {
      dialogVisible,
      editDialogVisible,
      connections,
      editingConnection,
      showEditDialog,
      saveConnection,
      deleteConnection,
      connect,
      exportConfig,
      importConfig
    }
  }
})
</script> 