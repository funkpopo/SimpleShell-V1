# 创建新文件
<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'

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
// 路径输入框引用
const pathInputRef = ref<HTMLInputElement | null>(null)
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
// 右键菜单状态
const showContextMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const contextMenuTarget = ref<'file' | 'directory' | 'background'>('background')
const clickedItem = ref<string | null>(null)
// 高亮显示的项目
const highlightedItem = ref<string | null>(null)
// 加载超时时间（毫秒）
const LOADING_TIMEOUT = 15000 // 增加到15秒

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
    
    // 清除之前的选中和高亮状态
    selectedFiles.value.clear()
    
    // 添加加载超时控制
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('加载目录超时，请稍后再试')), LOADING_TIMEOUT)
    })
    
    // 添加重试机制
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒
    
    while (retryCount < maxRetries) {
      try {
        // 使用Promise.race在超时和正常请求之间竞争
        const result = await Promise.race([
          window.api.sftpReadDir({
            connectionId: props.connectionId,
            path: currentPath.value
          }),
          timeoutPromise
        ]) as any
        
        if (result.success && result.files) {
          console.log('目录加载成功，文件数量:', result.files.length)
          fileList.value = result.files as FileItem[]
          
          // 如果存在高亮项，滚动到该项
          if (highlightedItem.value) {
            await scrollToHighlightedItem()
          }
          
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

// 滚动到高亮显示的项目
const scrollToHighlightedItem = async () => {
  await nextTick()
  if (highlightedItem.value) {
    const highlightedElement = document.querySelector(`.file-list-row[data-name="${highlightedItem.value}"]`)
    if (highlightedElement) {
      highlightedElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      
      // 3秒后取消高亮
      setTimeout(() => {
        highlightedItem.value = null
      }, 3000)
    }
  }
}

// 进入目录
const enterDirectory = async (dirName: string) => {
  const newPath = currentPath.value === '/' 
    ? `/${dirName}` 
    : `${currentPath.value}/${dirName}`
  
  currentPath.value = newPath
}

// 通过路径输入框跳转
const navigateToPath = (event: Event) => {
  event.preventDefault()
  
  if (!pathInputRef.value) return
  
  let inputPath = pathInputRef.value.value.trim()
  
  // 格式化路径
  if (!inputPath.startsWith('/')) {
    inputPath = `/${inputPath}`
  }
  
  // 如果路径最后有斜杠且不是根路径，则删除
  if (inputPath.length > 1 && inputPath.endsWith('/')) {
    inputPath = inputPath.slice(0, -1)
  }
  
  // 解析目标目录和可能的高亮文件/文件夹
  let targetDir = inputPath
  let targetItem: string | null = null
  
  const lastSlashIndex = inputPath.lastIndexOf('/')
  const lastSegment = inputPath.substring(lastSlashIndex + 1)
  
  if (lastSegment && lastSlashIndex !== 0) {
    // 检查最后一段是否是文件/文件夹名
    targetDir = inputPath.substring(0, lastSlashIndex) || '/'
    targetItem = lastSegment
  }
  
  // 设置当前路径和高亮项
  highlightedItem.value = targetItem
  currentPath.value = targetDir
}

// 返回上级目录
const goToParentDirectory = () => {
  if (currentPath.value === '/') return
  
  const parentPath = currentPath.value.split('/').slice(0, -1).join('/')
  currentPath.value = parentPath || '/'
}

// 选择文件
const toggleFileSelection = (fileName: string, event?: MouseEvent) => {
  // 如果有按住Ctrl键，则不清除之前的选择
  if (event && !event.ctrlKey && !event.metaKey) {
    selectedFiles.value.clear()
  }
  
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
      // 创建成功后高亮新文件夹
      highlightedItem.value = dirName
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

// 显示右键菜单
const showMenu = (e: MouseEvent, target: 'file' | 'directory' | 'background', itemName?: string) => {
  e.preventDefault()
  
  // 设置右键菜单目标类型和点击的项目
  contextMenuTarget.value = target
  clickedItem.value = itemName || null
  
  // 如果点击了特定项目且该项目未被选中
  if (itemName && !selectedFiles.value.has(itemName)) {
    if (!e.ctrlKey && !e.metaKey) {
      selectedFiles.value.clear()
    }
    selectedFiles.value.add(itemName)
  }
  
  // 获取窗口尺寸
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // 设置右键菜单位置
  let posX = e.clientX
  let posY = e.clientY
  
  // 估计菜单尺寸
  const estimatedMenuWidth = 200
  const estimatedMenuHeight = 200
  
  // 确保菜单在可视区域内
  if (posX + estimatedMenuWidth > windowWidth) {
    posX = windowWidth - estimatedMenuWidth
  }
  
  if (posY + estimatedMenuHeight > windowHeight) {
    posY = windowHeight - estimatedMenuHeight
  }
  
  // 设置菜单位置
  menuPosition.value = { x: posX, y: posY }
  showContextMenu.value = true
  
  // 添加一次性的点击事件监听，点击其他地方关闭菜单
  setTimeout(() => {
    window.addEventListener('click', closeMenu, { once: true })
  }, 0)
}

// 关闭右键菜单
const closeMenu = () => {
  showContextMenu.value = false
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
    highlightedItem.value = null
    // 延迟加载目录，确保SFTP连接已经完全建立
    setTimeout(() => {
      loadCurrentDirectory()
    }, 2000) // 增加延迟到2秒
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
    }, 2000)
  }
})
</script>

<template>
  <div class="file-manager" :class="{ 'dark-theme': isDarkTheme }">
    <!-- 路径导航栏 -->
    <div class="path-navigation">
      <div class="path-breadcrumb">
        <button @click="goToParentDirectory" :disabled="currentPath === '/'">
          <span class="nav-icon">↑</span>
        </button>
      </div>
      <form @submit="navigateToPath" class="path-form">
        <input 
          type="text"
          ref="pathInputRef"
          class="path-input"
          :value="currentPath"
          placeholder="输入路径后按Enter跳转" 
        />
      </form>
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
      <button class="close-error" @click="error = ''">×</button>
    </div>
    
    <!-- 文件列表 -->
    <div class="file-list-container" @contextmenu="showMenu($event, 'background')">
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
            'is-directory': file.type === 'directory',
            'highlighted': highlightedItem === file.name
          }"
          :data-name="file.name"
          @click="toggleFileSelection(file.name, $event)"
          @dblclick="file.type === 'directory' && enterDirectory(file.name)"
          @contextmenu="showMenu($event, file.type, file.name)"
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
      
      <!-- 右键菜单 -->
      <div 
        v-if="showContextMenu" 
        class="context-menu"
        :class="{ 'dark-theme': isDarkTheme }"
        :style="{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }"
      >
        <!-- 文件右键菜单 -->
        <template v-if="contextMenuTarget === 'file'">
          <div class="menu-item" @click="downloadSelectedFiles">
            <span class="menu-icon">⬇️</span> 下载文件
          </div>
          <div class="menu-item" @click="deleteSelectedItems">
            <span class="menu-icon">🗑️</span> 删除文件
          </div>
        </template>
        
        <!-- 文件夹右键菜单 -->
        <template v-else-if="contextMenuTarget === 'directory'">
          <div 
            class="menu-item" 
            @click="clickedItem && enterDirectory(clickedItem)"
          >
            <span class="menu-icon">📂</span> 打开文件夹
          </div>
          <div class="menu-separator"></div>
          <div class="menu-item" @click="deleteSelectedItems">
            <span class="menu-icon">🗑️</span> 删除文件夹
          </div>
        </template>
        
        <!-- 背景右键菜单 -->
        <template v-else>
          <div class="menu-item" @click="uploadFiles">
            <span class="menu-icon">⬆️</span> 上传文件
          </div>
          <div class="menu-item" @click="createNewDirectory">
            <span class="menu-icon">📁</span> 新建文件夹
          </div>
          <div class="menu-separator"></div>
          <div class="menu-item" @click="goToParentDirectory" :class="{ 'disabled': currentPath === '/' }">
            <span class="menu-icon">↑</span> 返回上级
          </div>
          <div class="menu-item" @click="loadCurrentDirectory">
            <span class="menu-icon">🔄</span> 刷新
          </div>
        </template>
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

/* 路径导航栏 */
.path-navigation {
  padding: 8px 10px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #e0e0e0;
  align-items: center;
}

.dark-theme .path-navigation {
  border-bottom-color: #444444;
}

.path-breadcrumb {
  display: flex;
  align-items: center;
}

.path-breadcrumb button {
  background: none;
  border: none;
  padding: 5px 8px;
  font-size: 16px;
  cursor: pointer;
  border-radius: 4px;
  color: #333;
}

.dark-theme .path-breadcrumb button {
  color: #ddd;
}

.path-breadcrumb button:hover:not(:disabled) {
  background-color: rgba(0, 0, 0, 0.1);
}

.dark-theme .path-breadcrumb button:hover:not(:disabled) {
  background-color: rgba(255, 255, 255, 0.1);
}

.path-breadcrumb button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.nav-icon {
  font-weight: bold;
}

.path-form {
  flex: 1;
}

.path-input {
  width: 100%;
  padding: 6px 10px;
  font-family: monospace;
  border-radius: 4px;
  border: 1px solid #d0d0d0;
  background-color: #ffffff;
  color: #333333;
}

.dark-theme .path-input {
  background-color: #2a2a2a;
  border-color: #555555;
  color: #ffffff;
}

.path-input:focus {
  outline: none;
  border-color: #4d90fe;
  box-shadow: 0 0 0 2px rgba(77, 144, 254, 0.2);
}

.dark-theme .path-input:focus {
  border-color: #1a73e8;
  box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
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
  position: relative;
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

.file-list-row.highlighted {
  background-color: #fff9c4;
  animation: highlight-pulse 3s ease-in-out;
}

.dark-theme .file-list-row.highlighted {
  background-color: #5d4037;
  animation: highlight-pulse-dark 3s ease-in-out;
}

@keyframes highlight-pulse {
  0%, 100% { background-color: #fff9c4; }
  50% { background-color: #ffeb3b; }
}

@keyframes highlight-pulse-dark {
  0%, 100% { background-color: #5d4037; }
  50% { background-color: #8d6e63; }
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

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background-color: #ffffff;
  border-radius: 4px;
  min-width: 180px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  z-index: 1000;
}

.context-menu.dark-theme {
  background-color: #333333;
  border: 1px solid #444444;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.menu-item {
  padding: 10px 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.menu-item:hover {
  background-color: #f5f5f5;
}

.dark-theme .menu-item:hover {
  background-color: #444444;
}

.menu-icon {
  margin-right: 10px;
  font-size: 16px;
  width: 20px;
  text-align: center;
}

.menu-separator {
  height: 1px;
  background-color: #e0e0e0;
  margin: 5px 0;
}

.dark-theme .menu-separator {
  background-color: #444444;
}

.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-item.disabled:hover {
  background-color: inherit;
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