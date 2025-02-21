<template>
  <div class="connections-container">
    <div class="section-header">
      <el-icon><Connection /></el-icon>
      <span>连接管理</span>
    </div>
    
    <!-- 连接分组 -->
    <el-collapse v-model="activeGroups">
      <el-collapse-item 
        v-for="group in connectionGroups" 
        :key="group.id" 
        :title="group.name"
        :name="group.id"
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

    <!-- 添加连接按钮 -->
    <div class="add-connection">
      <el-button type="primary" size="small" @click="showAddDialog">
        <el-icon><Plus /></el-icon>
        添加连接
      </el-button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { Connection, Edit, Delete, Plus, Monitor } from '@element-plus/icons-vue'

interface ConnectionItem {
  id: string
  name: string
  host: string
  port: number
  username: string
}

interface ConnectionGroup {
  id: string
  name: string
  connections: ConnectionItem[]
}

export default defineComponent({
  name: 'Connections',
  components: {
    Connection,
    Edit,
    Delete,
    Plus,
    Terminal: Monitor
  },
  setup() {
    const activeGroups = ref(['default'])
    const connectionGroups = ref<ConnectionGroup[]>([
      {
        id: 'default',
        name: '默认分组',
        connections: [
          {
            id: '1',
            name: 'Local SSH',
            host: 'localhost',
            port: 22,
            username: 'root'
          }
        ]
      }
    ])

    const handleConnect = (conn: ConnectionItem) => {
      // TODO: 实现连接逻辑
      console.log('连接到:', conn)
    }

    const editConnection = (conn: ConnectionItem) => {
      // TODO: 实现编辑逻辑
      console.log('编辑连接:', conn)
    }

    const deleteConnection = (conn: ConnectionItem) => {
      // TODO: 实现删除逻辑
      console.log('删除连接:', conn)
    }

    const showAddDialog = () => {
      // TODO: 实现添加连接对话框
      console.log('显示添加连接对话框')
    }

    return {
      activeGroups,
      connectionGroups,
      handleConnect,
      editConnection,
      deleteConnection,
      showAddDialog
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

  :deep(.el-collapse) {
    border: none;
    background-color: transparent;
    
    .el-collapse-item__header {
      background-color: #2c2c2c;
      color: #fff;
      border-bottom: 1px solid #333;
      
      &:hover {
        background-color: #363636;
      }
    }
    
    .el-collapse-item__content {
      background-color: #1e1e1e;
      padding: 0;
    }
  }

  .connection-list {
    .connection-item {
      display: flex;
      align-items: center;
      padding: 10px 15px;
      cursor: pointer;
      border-bottom: 1px solid #333;
      
      &:hover {
        background-color: #2c2c2c;
        
        .connection-actions {
          opacity: 1;
        }
      }
      
      .el-icon {
        margin-right: 8px;
        font-size: 16px;
      }
      
      .connection-name {
        flex: 1;
      }
      
      .connection-actions {
        opacity: 0;
        transition: opacity 0.2s;
        
        .el-icon {
          margin-left: 8px;
          font-size: 14px;
          
          &:hover {
            color: #409eff;
          }
        }
      }
    }
  }

  .add-connection {
    padding: 15px;
    border-top: 1px solid #333;
    margin-top: auto;
    
    .el-button {
      width: 100%;
    }
  }
}
</style> 