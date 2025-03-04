# 创建新文件
<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

// 定义文件/文件夹项的接口
interface FileItem {
  name: string
  type: 'file' | 'directory'
  size: number
  modifyTime: string
  permissions: string
  owner: string
  group: string
}

// 定义props
const props = defineProps<{
  connectionId: string
  isDarkTheme: boolean
}>()

// 当前路径
const currentPath = ref('/')
// 文件列表
const fileList = ref<FileItem[]>([])
// 加载状态
const isLoading = ref(false)
// 错误信息
const error = ref('')
// 选中的文件
const selectedFiles = ref<Set<string>>(new Set())
// 排序方式
const sortBy = ref<'name' | 'size' | 'modifyTime'>('name')
const sortOrder = ref<'asc' | 'desc'>('asc')

// 格式化文件大小
const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

// 格式化修改时间
const formatModifyTime = (time: string): string => {
  return new Date(time).toLocaleString()
}

// 加载当前目录内容
const loadCurrentDirectory = async () => {
  try {
    console.log('开始加载目录，连接ID:', props.connectionId)
    console.log('当前路径:', currentPath.value)
    isLoading.value = true
    error.value = ''
    
    if (!props.connectionId) {
      console.error('无效的连接ID')
      error.value = '连接ID无效'
      return
    }
    
    // 添加重试机制
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒
    
    while (retryCount < maxRetries) {
      try {
        const result = await window.api.sftpReadDir({
          connectionId: props.connectionId,
          path: currentPath.value
        })
        
        if (result.success && result.files) {
          console.log('目录加载成功，文件数量:', result.files.length)
          fileList.value = result.files as FileItem[]
          return // 成功后直接返回
        } else {
          console.error(`目录加载失败 (尝试 ${retryCount + 1}/${maxRetries}):`, result.error)
          error.value = result.error || '加载目录失败'
          fileList.value = []
        }
      } catch (err: any) {
        console.error(`加载目录时发生错误 (尝试 ${retryCount + 1}/${maxRetries}):`, err)
        error.value = err.message || '加载目录时发生错误'
        fileList.value = []
      }
      
      retryCount++
      if (retryCount < maxRetries) {
        console.log(`等待 ${retryDelay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  } finally {
    isLoading.value = false
  }
}

// 进入目录
const enterDirectory = async (dirName: string) => {
  const newPath = currentPath.value === '/' 
    ? `/${dirName}` 
    : `${currentPath.value}/${dirName}`
  
  currentPath.value = newPath
}

// 返回上级目录
const goToParentDirectory = () => {
  if (currentPath.value === '/') return
  
  const parentPath = currentPath.value.split('/').slice(0, -1).join('/')
  currentPath.value = parentPath || '/'
}

// 选择文件
const toggleFileSelection = (fileName: string) => {
  if (selectedFiles.value.has(fileName)) {
    selectedFiles.value.delete(fileName)
  } else {
    selectedFiles.value.add(fileName)
  }
}

// 清除选择
const clearSelection = () => {
  selectedFiles.value.clear()
}

// 下载选中的文件
const downloadSelectedFiles = async () => {
  try {
    for (const fileName of selectedFiles.value) {
      const result = await window.api.sftpDownloadFile({
        connectionId: props.connectionId,
        remotePath: `${currentPath.value}/${fileName}`
      })
      
      if (!result.success) {
        error.value = `下载文件 ${fileName} 失败: ${result.error}`
        break
      }
    }
    clearSelection()
  } catch (err: any) {
    error.value = err.message || '下载文件时发生错误'
  }
}

// 上传文件
const uploadFiles = async () => {
  try {
    const result = await window.api.openFileDialog({
      title: '选择要上传的文件',
      buttonLabel: '上传'
    })
    
    if (!result.canceled && result.filePath) {
      const uploadResult = await window.api.sftpUploadFile({
        connectionId: props.connectionId,
        localPath: result.filePath,
        remotePath: currentPath.value
      })
      
      if (!uploadResult.success) {
        error.value = `上传文件失败: ${uploadResult.error}`
      } else {
        // 刷新当前目录
        await loadCurrentDirectory()
      }
    }
  } catch (err: any) {
    error.value = err.message || '上传文件时发生错误'
  }
}

// 创建新文件夹
const createNewDirectory = async () => {
  const dirName = prompt('请输入文件夹名称:')
  if (!dirName) return
  
  try {
    const result = await window.api.sftpMkdir({
      connectionId: props.connectionId,
      path: `${currentPath.value}/${dirName}`
    })
    
    if (result.success) {
      await loadCurrentDirectory()
    } else {
      error.value = result.error || '创建文件夹失败'
    }
  } catch (err: any) {
    error.value = err.message || '创建文件夹时发生错误'
  }
}

// 删除选中的文件/文件夹
const deleteSelectedItems = async () => {
  if (!confirm('确定要删除选中的项目吗？此操作不可恢复。')) return
  
  try {
    for (const fileName of selectedFiles.value) {
      const result = await window.api.sftpDelete({
        connectionId: props.connectionId,
        path: `${currentPath.value}/${fileName}`
      })
      
      if (!result.success) {
        error.value = `删除 ${fileName} 失败: ${result.error}`
        break
      }
    }
    clearSelection()
    await loadCurrentDirectory()
  } catch (err: any) {
    error.value = err.message || '删除文件时发生错误'
  }
}

// 排序文件列表
const sortFiles = () => {
  fileList.value.sort((a, b) => {
    // 文件夹始终排在前面
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1
    }
    
    let comparison = 0
    switch (sortBy.value) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'size':
        comparison = a.size - b.size
        break
      case 'modifyTime':
        comparison = new Date(a.modifyTime).getTime() - new Date(b.modifyTime).getTime()
        break
    }
    
    return sortOrder.value === 'asc' ? comparison : -comparison
  })
}

// 切换排序方式
const toggleSort = (field: 'name' | 'size' | 'modifyTime') => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
}

// 监听路径变化
watch(currentPath, () => {
  loadCurrentDirectory()
})

// 监听文件列表变化，自动排序
watch([fileList, sortBy, sortOrder], () => {
  sortFiles()
}, { deep: true })

// 监听连接ID变化
watch(() => props.connectionId, (newId, oldId) => {
  console.log('连接ID变化:', { oldId, newId })
  if (newId) {
    console.log('检测到新的连接ID，重置路径并加载目录')
    currentPath.value = '/'
    // 延迟加载目录，确保SFTP连接已经完全建立
    setTimeout(() => {
      loadCurrentDirectory()
    }, 1000) // 增加延迟到1秒
  } else {
    console.log('连接ID被清除，清空文件列表')
    fileList.value = []
    error.value = ''
  }
}, { immediate: true })

// 组件挂载时加载目录
onMounted(() => {
  console.log('FileManager组件挂载，当前连接ID:', props.connectionId)
  if (props.connectionId) {
    // 延迟加载目录，确保SFTP连接已经完全建立
    setTimeout(() => {
      loadCurrentDirectory()
    }, 1000)
  }
})
</script>

<template>
  <div class="file-manager" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button @click="goToParentDirectory" :disabled="currentPath === '/'">
        返回上级
      </button>
      <button @click="uploadFiles">
        上传文件
      </button>
      <button @click="createNewDirectory">
        新建文件夹
      </button>
      <button 
        @click="downloadSelectedFiles" 
        :disabled="selectedFiles.size === 0"
      >
        下载选中
      </button>
      <button 
        @click="deleteSelectedItems" 
        :disabled="selectedFiles.size === 0"
        class="danger"
      >
        删除选中
      </button>
    </div>
    
    <!-- 当前路径 -->
    <div class="current-path">
      当前路径: {{ currentPath }}
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button class="close-error" @click="error = ''">×</button>
    </div>
    
    <!-- 文件列表 -->
    <div class="file-list-container">
      <!-- 表头 -->
      <div class="file-list-header">
        <div class="file-list-row">
          <div class="checkbox-cell">
            <input 
              type="checkbox" 
              :checked="selectedFiles.size === fileList.length && fileList.length > 0"
              :indeterminate="selectedFiles.size > 0 && selectedFiles.size < fileList.length"
              @change="(e) => {
                const target = e.target as HTMLInputElement
                if (target.checked) {
                  fileList.forEach(f => selectedFiles.add(f.name))
                } else {
                  clearSelection()
                }
              }"
            >
          </div>
          <div 
            class="name-cell sortable" 
            @click="toggleSort('name')"
          >
            文件名
            <span v-if="sortBy === 'name'" class="sort-indicator">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </div>
          <div 
            class="size-cell sortable" 
            @click="toggleSort('size')"
          >
            大小
            <span v-if="sortBy === 'size'" class="sort-indicator">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </div>
          <div 
            class="time-cell sortable" 
            @click="toggleSort('modifyTime')"
          >
            修改时间
            <span v-if="sortBy === 'modifyTime'" class="sort-indicator">
              {{ sortOrder === 'asc' ? '↑' : '↓' }}
            </span>
          </div>
          <div class="permissions-cell">权限</div>
          <div class="owner-cell">所有者</div>
        </div>
      </div>
      
      <!-- 加载中提示 -->
      <div v-if="isLoading" class="loading">
        加载中...
      </div>
      
      <!-- 文件列表内容 -->
      <div v-else class="file-list">
        <div 
          v-for="file in fileList" 
          :key="file.name"
          class="file-list-row"
          :class="{
            'selected': selectedFiles.has(file.name),
            'is-directory': file.type === 'directory'
          }"
          @click="toggleFileSelection(file.name)"
          @dblclick="file.type === 'directory' && enterDirectory(file.name)"
        >
          <div class="checkbox-cell">
            <input 
              type="checkbox" 
              :checked="selectedFiles.has(file.name)"
              @click.stop
              @change="toggleFileSelection(file.name)"
            >
          </div>
          <div class="name-cell">
            <span class="file-icon">
              {{ file.type === 'directory' ? '📁' : '📄' }}
            </span>
            {{ file.name }}
          </div>
          <div class="size-cell">
            {{ file.type === 'directory' ? '-' : formatFileSize(file.size) }}
          </div>
          <div class="time-cell">
            {{ formatModifyTime(file.modifyTime) }}
          </div>
          <div class="permissions-cell">{{ file.permissions }}</div>
          <div class="owner-cell">{{ file.owner }}</div>
        </div>
      </div>
      
      <!-- 空状态提示 -->
      <div v-if="!isLoading && fileList.length === 0" class="empty-state">
        当前目录为空
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  color: #333333;
}

.dark-theme {
  background-color: #1a1a1a;
  color: #ffffff;
}

.toolbar {
  padding: 10px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e0e0e0;
}

.dark-theme .toolbar {
  border-bottom-color: #444444;
}

button {
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid #d0d0d0;
  background-color: #ffffff;
  color: #333333;
  cursor: pointer;
  transition: all 0.2s;
}

.dark-theme button {
  background-color: #333333;
  border-color: #555555;
  color: #ffffff;
}

button:hover:not(:disabled) {
  background-color: #f5f5f5;
}

.dark-theme button:hover:not(:disabled) {
  background-color: #444444;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.danger {
  color: #ff4444;
  border-color: #ff4444;
}

.dark-theme button.danger {
  color: #ff6b6b;
  border-color: #ff6b6b;
}

button.danger:hover:not(:disabled) {
  background-color: #ff4444;
  color: #ffffff;
}

.dark-theme button.danger:hover:not(:disabled) {
  background-color: #ff6b6b;
}

.current-path {
  padding: 10px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  font-family: monospace;
}

.dark-theme .current-path {
  background-color: #2a2a2a;
  border-bottom-color: #444444;
}

.error-message {
  margin: 10px;
  padding: 10px;
  background-color: #ff4444;
  color: #ffffff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close-error {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  padding: 0 5px;
}

.file-list-container {
  flex: 1;
  overflow: auto;
  display: flex;
  flex-direction: column;
}

.file-list-header {
  position: sticky;
  top: 0;
  background-color: #f5f5f5;
  border-bottom: 2px solid #e0e0e0;
  font-weight: bold;
  z-index: 1;
}

.dark-theme .file-list-header {
  background-color: #2a2a2a;
  border-bottom-color: #444444;
}

.file-list {
  flex: 1;
}

.file-list-row {
  display: grid;
  grid-template-columns: 40px 3fr 1fr 2fr 1fr 1fr;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #e0e0e0;
  cursor: pointer;
}

.dark-theme .file-list-row {
  border-bottom-color: #444444;
}

.file-list-row:hover {
  background-color: #f5f5f5;
}

.dark-theme .file-list-row:hover {
  background-color: #2a2a2a;
}

.file-list-row.selected {
  background-color: #e3f2fd;
}

.dark-theme .file-list-row.selected {
  background-color: #1e3a5f;
}

.checkbox-cell {
  display: flex;
  align-items: center;
  justify-content: center;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-icon {
  font-size: 16px;
}

.size-cell,
.time-cell,
.permissions-cell,
.owner-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.sort-indicator {
  margin-left: 4px;
  font-weight: bold;
}

.loading,
.empty-state {
  padding: 20px;
  text-align: center;
  color: #666666;
}

.dark-theme .loading,
.dark-theme .empty-state {
  color: #999999;
}

/* 滚动条样式 */
.file-list-container {
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.dark-theme .file-list-container {
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.file-list-container::-webkit-scrollbar {
  width: 8px;
}

.file-list-container::-webkit-scrollbar-track {
  background: transparent;
}

.file-list-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.dark-theme .file-list-container::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

.file-list-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(0, 0, 0, 0.3);
}

.dark-theme .file-list-container::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
</style> 