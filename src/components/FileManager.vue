<template>
  <div class="file-manager-container">
    <div class="file-manager-header">
      <el-input
        v-model="searchText"
        placeholder="搜索文件..."
        prefix-icon="Search"
        clearable
      />
    </div>
    
    <el-tree
      :data="fileTree"
      :props="defaultProps"
      @node-click="handleNodeClick"
      node-key="path"
      :expand-on-click-node="false"
      :default-expanded-keys="['root']"
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <el-icon v-if="data.type === 'directory'"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>
          <span>{{ node.label }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { ElMessage } from 'element-plus'

export default defineComponent({
  name: 'FileManager',
  setup() {
    const searchText = ref('')
    const fileTree = ref([
      {
        label: 'root',
        path: 'root',
        type: 'directory',
        children: [
          {
            label: 'documents',
            path: 'root/documents',
            type: 'directory',
            children: []
          },
          {
            label: 'projects',
            path: 'root/projects',
            type: 'directory',
            children: []
          }
        ]
      }
    ])

    const defaultProps = {
      children: 'children',
      label: 'label'
    }

    const handleNodeClick = (data: any) => {
      if (data.type === 'file') {
        ElMessage.info(`打开文件: ${data.path}`)
      }
    }

    return {
      searchText,
      fileTree,
      defaultProps,
      handleNodeClick
    }
  }
})
</script>

<style lang="scss" scoped>
.file-manager-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  
  .file-manager-header {
    padding: 10px;
  }
  
  .el-tree {
    background-color: transparent;
    color: #fff;
    flex: 1;
    overflow: auto;
  }
  
  .custom-tree-node {
    display: flex;
    align-items: center;
    
    .el-icon {
      margin-right: 8px;
      font-size: 16px;
    }
  }
}

:deep(.el-tree-node__content:hover) {
  background-color: #2c2c2c;
}

:deep(.el-tree-node__content) {
  background-color: transparent;
}
</style> 