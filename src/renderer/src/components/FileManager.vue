# 创建新文件
<script setup lang="ts">
import { ref, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import DeleteDayIcon from '../assets/delete-day.svg'
import DeleteNightIcon from '../assets/delete-night.svg'
import UploadDayIcon from '../assets/upload-day.svg'
import UploadNightIcon from '../assets/upload-night.svg'
import DownloadDayIcon from '../assets/download-day.svg'
import DownloadNightIcon from '../assets/download-night.svg'
import PlusDayIcon from '../assets/plus-day.svg'
import PlusNightIcon from '../assets/plus-night.svg'
import BackDayIcon from '../assets/back-day.svg'
import BackNightIcon from '../assets/back-night.svg'
import RefreshDayIcon from '../assets/refresh-day.svg'
import RefreshNightIcon from '../assets/refresh-night.svg'
import OpenFolderDayIcon from '../assets/openfolder-day.svg'
import OpenFolderNightIcon from '../assets/openfolder-night.svg'

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
// 成功消息
const successMessage = ref('')
// 成功消息计时器
let successMessageTimer: number | null = null
// 选中的文件
const selectedFiles = ref<Set<string>>(new Set())
// 选中的项目类型映射
const selectedItemTypes = ref<Map<string, 'file' | 'directory'>>(new Map())
// 删除操作进度状态
const deleteProgress = ref({
  isDeleting: false,
  total: 0,
  completed: 0,
  currentItem: ''
})
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
    selectedItemTypes.value.clear()
    
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
const toggleFileSelection = (fileName: string, fileType: 'file' | 'directory', event?: MouseEvent) => {
  // 如果有按住Ctrl键，则不清除之前的选择
  if (event && !event.ctrlKey && !event.metaKey) {
    selectedFiles.value.clear()
    selectedItemTypes.value.clear()
  }
  
  if (selectedFiles.value.has(fileName)) {
    selectedFiles.value.delete(fileName)
    selectedItemTypes.value.delete(fileName)
  } else {
    selectedFiles.value.add(fileName)
    selectedItemTypes.value.set(fileName, fileType)
  }
}

// 清除选择
const clearSelection = () => {
  selectedFiles.value.clear()
  selectedItemTypes.value.clear()
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
      buttonLabel: '上传',
      filters: [
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile', 'multiSelections']
    })
    
    if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
      let successCount = 0
      let failCount = 0
      
      for (const filePath of result.filePaths) {
        try {
          const uploadResult = await window.api.sftpUploadFile({
            connectionId: props.connectionId,
            localPath: filePath,
            remotePath: currentPath.value
          })
          
          if (uploadResult.success) {
            successCount++
          } else {
            failCount++
            console.error(`上传文件 ${filePath} 失败:`, uploadResult.error)
          }
        } catch (err) {
          failCount++
          console.error(`上传文件 ${filePath} 时发生错误:`, err)
        }
      }
      
      // 显示上传结果
      if (successCount > 0) {
        showSuccessMessage(`成功上传 ${successCount} 个文件${failCount > 0 ? `，${failCount} 个文件上传失败` : ''}`)
      } else if (failCount > 0) {
        error.value = `所有文件上传失败`
      }
      
      // 刷新当前目录
      await loadCurrentDirectory()
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

// 获取选中的项目的类型统计
const getSelectedItemsCount = () => {
  let files = 0
  let directories = 0
  
  selectedItemTypes.value.forEach((type) => {
    if (type === 'file') files++
    else directories++
  })
  
  return { files, directories }
}

// 显示成功消息
const showSuccessMessage = (message: string) => {
  // 清除之前的计时器
  if (successMessageTimer !== null) {
    clearTimeout(successMessageTimer)
  }
  
  // 设置新消息
  successMessage.value = message
  
  // 3秒后自动清除
  successMessageTimer = window.setTimeout(() => {
    successMessage.value = ''
    successMessageTimer = null
  }, 3000)
}

// 删除选中的文件/文件夹
const deleteSelectedItems = async () => {
  const { files, directories } = getSelectedItemsCount()
  
  let confirmMessage = ''
  if (files > 0 && directories > 0) {
    confirmMessage = `确定要删除选中的 ${files} 个文件和 ${directories} 个文件夹吗？此操作不可恢复。`
  } else if (files > 0) {
    confirmMessage = `确定要删除选中的 ${files} 个文件吗？此操作不可恢复。`
  } else if (directories > 0) {
    confirmMessage = `确定要删除选中的 ${directories} 个文件夹吗？文件夹内的所有内容也会被删除，此操作不可恢复。`
  } else {
    return // 没有选中任何项目
  }
  
  if (!confirm(confirmMessage)) return
  
  // 清除之前的成功消息
  successMessage.value = ''
  
  // 设置删除进度状态
  deleteProgress.value = {
    isDeleting: true,
    total: selectedFiles.value.size,
    completed: 0,
    currentItem: ''
  }
  
  try {
    // 转换为数组以便按顺序处理
    const itemsToDelete = Array.from(selectedFiles.value)
    
    for (const fileName of itemsToDelete) {
      deleteProgress.value.currentItem = fileName
      
      const fileType = selectedItemTypes.value.get(fileName) || 'file'
      
      try {
        // 构建完整路径
        const fullPath = `${currentPath.value}/${fileName}`
        
        // 执行删除操作
        const result = await window.api.sftpDelete({
          connectionId: props.connectionId,
          path: fullPath
        })
        
        if (!result.success) {
          throw new Error(result.error || `删除${fileType === 'file' ? '文件' : '文件夹'} ${fileName} 失败`)
        }
        
        // 更新完成数量
        deleteProgress.value.completed++
      } catch (itemError: any) {
        console.error(`删除 ${fileName} 失败:`, itemError)
        error.value = itemError.message || `删除 ${fileName} 时发生错误`
        
        // 如果不是最后一个项目，提示是否继续
        if (deleteProgress.value.completed < deleteProgress.value.total - 1) {
          if (!confirm(`删除 ${fileName} 失败: ${error.value}\n\n是否继续删除其他项目？`)) {
            break
          }
        }
      }
    }
    
    // 清除选择
    clearSelection()
    
    // 刷新当前目录
    await loadCurrentDirectory()
    
    // 显示成功消息
    if (deleteProgress.value.completed === deleteProgress.value.total) {
      // 所有项目都成功删除
      const message = deleteProgress.value.total === 1 
        ? `已成功删除 1 个项目` 
        : `已成功删除 ${deleteProgress.value.completed} 个项目`
      
      showSuccessMessage(message)
    } else if (deleteProgress.value.completed > 0) {
      // 部分项目删除成功
      showSuccessMessage(`已删除 ${deleteProgress.value.completed}/${deleteProgress.value.total} 个项目`)
    }
  } catch (err: any) {
    console.error('删除操作失败:', err)
    error.value = err.message || '删除文件时发生错误'
  } finally {
    // 重置删除进度状态
    deleteProgress.value.isDeleting = false
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
  if (itemName) {
    // 获取项目类型
    const fileItem = fileList.value.find(f => f.name === itemName)
    if (fileItem) {
      // 根据实际的文件类型设置contextMenuTarget
      contextMenuTarget.value = fileItem.type
      
      if (!selectedFiles.value.has(itemName)) {
        if (!e.ctrlKey && !e.metaKey) {
          selectedFiles.value.clear()
          selectedItemTypes.value.clear()
        }
        selectedFiles.value.add(itemName)
        selectedItemTypes.value.set(itemName, fileItem.type)
      }
    }
  }
  
  // 获取窗口尺寸
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  
  // 初始设置菜单位置为鼠标位置
  let posX = e.clientX
  let posY = e.clientY
  
  // 菜单估计尺寸 - 宽和高的初始估计值，但会在渲染后重新调整
  const estimatedMenuWidth = 220  // 增加一些余量
  const estimatedMenuHeight = 230
  
  // 确保菜单在可视区域内的初步调整
  if (posX + estimatedMenuWidth > windowWidth) {
    // 如果右侧空间不足，则显示在鼠标左侧
    posX = posX - estimatedMenuWidth
  }
  
  if (posY + estimatedMenuHeight > windowHeight) {
    // 如果底部空间不足，则显示在鼠标上方
    posY = posY - estimatedMenuHeight
  }
  
  // 确保不超出左边界
  if (posX < 0) posX = 10
  
  // 确保不超出上边界
  if (posY < 0) posY = 10
  
  // 设置菜单位置
  menuPosition.value = { x: posX, y: posY }
  showContextMenu.value = true
  
  // 添加一次性的点击事件监听，点击其他地方关闭菜单
  setTimeout(() => {
    window.addEventListener('click', closeMenu, { once: true })
    // 确保点击ESC也能关闭菜单
    window.addEventListener('keydown', handleMenuKeydown, { once: true })
    
    // 在下一个渲染周期，根据实际菜单尺寸进行位置微调
    nextTick(() => {
      const menuElement = document.querySelector('.context-menu') as HTMLElement
      if (menuElement) {
        const menuRect = menuElement.getBoundingClientRect()
        
        // 获取菜单实际尺寸
        const actualMenuWidth = menuRect.width
        const actualMenuHeight = menuRect.height
        
        // 再次检查并调整位置
        let adjustedX = menuPosition.value.x
        let adjustedY = menuPosition.value.y
        
        // 右侧边界检查
        if (adjustedX + actualMenuWidth > windowWidth) {
          adjustedX = windowWidth - actualMenuWidth - 10 // 10px边距
        }
        
        // 左侧边界检查
        if (adjustedX < 0) {
          adjustedX = 10
        }
        
        // 底部边界检查
        if (adjustedY + actualMenuHeight > windowHeight) {
          adjustedY = windowHeight - actualMenuHeight - 10
        }
        
        // 顶部边界检查
        if (adjustedY < 0) {
          adjustedY = 10
        }
        
        // 如果位置有调整，应用新位置
        if (adjustedX !== menuPosition.value.x || adjustedY !== menuPosition.value.y) {
          menuPosition.value = { x: adjustedX, y: adjustedY }
        }
      }
    })
  }, 0)
}

// 处理菜单键盘事件
const handleMenuKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    closeMenu()
  }
}

// 关闭右键菜单
const closeMenu = () => {
  showContextMenu.value = false
  window.removeEventListener('keydown', handleMenuKeydown)
}

// 处理键盘删除事件
const handleKeyDown = (e: KeyboardEvent) => {
  // 如果按下Delete键并且选中了项目
  if (e.key === 'Delete' && selectedFiles.value.size > 0) {
    // 阻止默认行为
    e.preventDefault()
    // 触发删除操作
    deleteSelectedItems()
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

// 处理窗口大小变化时调整菜单位置
const handleWindowResize = () => {
  if (showContextMenu.value) {
    // 获取当前窗口尺寸
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight
    
    // 获取菜单元素
    const menuElement = document.querySelector('.context-menu') as HTMLElement
    if (menuElement) {
      const menuRect = menuElement.getBoundingClientRect()
      
      // 检查是否超出可视区域
      let needsAdjustment = false
      let newX = menuPosition.value.x
      let newY = menuPosition.value.y
      
      // 右侧检查
      if (newX + menuRect.width > windowWidth) {
        newX = windowWidth - menuRect.width - 10
        needsAdjustment = true
      }
      
      // 左侧检查
      if (newX < 0) {
        newX = 10
        needsAdjustment = true
      }
      
      // 底部检查
      if (newY + menuRect.height > windowHeight) {
        newY = windowHeight - menuRect.height - 10
        needsAdjustment = true
      }
      
      // 顶部检查
      if (newY < 0) {
        newY = 10
        needsAdjustment = true
      }
      
      // 更新位置
      if (needsAdjustment) {
        menuPosition.value = { x: newX, y: newY }
      }
    }
  }
}

// 组件挂载时加载目录
onMounted(() => {
  console.log('FileManager组件挂载，当前连接ID:', props.connectionId)
  if (props.connectionId) {
    // 延迟加载目录，确保SFTP连接已经完全建立
    setTimeout(() => {
      loadCurrentDirectory()
    }, 2000)
  }
  
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleWindowResize)
})

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleWindowResize)
  
  // 清除计时器
  if (successMessageTimer !== null) {
    clearTimeout(successMessageTimer)
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
    
    <!-- 成功提示 -->
    <div v-if="successMessage" class="success-message">
      {{ successMessage }}
      <button class="close-success" @click="successMessage = ''">×</button>
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
          @click="toggleFileSelection(file.name, file.type, $event)"
          @dblclick="file.type === 'directory' && enterDirectory(file.name)"
          @contextmenu.stop="showMenu($event, file.type, file.name)"
        >
          <div class="checkbox-cell">
            <input 
              type="checkbox" 
              :checked="selectedFiles.has(file.name)"
              @click.stop
              @change="toggleFileSelection(file.name, file.type)"
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
      
      <!-- 删除进度条 -->
      <div v-if="deleteProgress.isDeleting" class="delete-progress">
        <div class="progress-info">
          正在删除: {{ deleteProgress.currentItem }}
          <span class="progress-counter">{{ deleteProgress.completed }}/{{ deleteProgress.total }}</span>
        </div>
        <div class="progress-bar-container">
          <div 
            class="progress-bar" 
            :style="{ width: `${(deleteProgress.completed / deleteProgress.total) * 100}%` }"
          ></div>
        </div>
      </div>
      
      <!-- 右键菜单 -->
      <div 
        v-if="showContextMenu" 
        class="context-menu"
        :class="{ 'dark-theme': props.isDarkTheme }"
        :style="{ top: `${menuPosition.y}px`, left: `${menuPosition.x}px` }"
      >
        <!-- 文件右键菜单 -->
        <template v-if="contextMenuTarget === 'file'">
          <div class="menu-item" @click="downloadSelectedFiles">
            <img
              :src="props.isDarkTheme ? DownloadNightIcon : DownloadDayIcon"
              class="download-icon"
            />
            {{ selectedFiles.size > 1 ? `下载 ${selectedFiles.size} 个文件` : '下载文件' }}
          </div>
          <div class="menu-item delete-menu-item" @click="deleteSelectedItems">
            <img
              :src="props.isDarkTheme ? DeleteNightIcon : DeleteDayIcon"
              class="delete-icon"
            />
            {{ selectedFiles.size > 1 ? `删除 ${selectedFiles.size} 个文件` : '删除文件' }}
          </div>
        </template>
        
        <!-- 文件夹右键菜单 -->
        <template v-else-if="contextMenuTarget === 'directory'">
          <div 
            class="menu-item" 
            @click="clickedItem && enterDirectory(clickedItem)"
          >
            <img
              :src="props.isDarkTheme ? OpenFolderNightIcon : OpenFolderDayIcon"
              class="openfolder-icon"
            />
            打开文件夹
          </div>
          <div class="menu-separator"></div>
          <div class="menu-item delete-menu-item" @click="deleteSelectedItems">
            <img
              :src="props.isDarkTheme ? DeleteNightIcon : DeleteDayIcon"
              class="delete-icon"
            /> 
            {{ selectedFiles.size > 1 ? `删除 ${selectedFiles.size} 个文件夹` : '删除文件夹' }}
          </div>
        </template>
        
        <!-- 背景右键菜单 -->
        <template v-else>
          <div class="menu-item" @click="uploadFiles">
            <img
              :src="props.isDarkTheme ? UploadNightIcon : UploadDayIcon"
              class="upload-icon"
            />
            上传文件
          </div>
          <div class="menu-item" @click="createNewDirectory">
            <img
              :src="props.isDarkTheme ? PlusNightIcon : PlusDayIcon"
              class="plus-icon"
            />
            新建文件夹
          </div>
          <div class="menu-separator"></div>
          <div class="menu-item" @click="goToParentDirectory" :class="{ 'disabled': currentPath === '/' }">
            <img
              :src="props.isDarkTheme ? BackNightIcon : BackDayIcon"
              class="back-icon"
            />
            返回上级
          </div>
          <div class="menu-item" @click="loadCurrentDirectory">
            <img
              :src="props.isDarkTheme ? RefreshNightIcon : RefreshDayIcon"
              class="refresh-icon"
            />
            刷新
          </div>
          <template v-if="selectedFiles.size > 0">
            <div class="menu-separator"></div>
            <div class="menu-item delete-menu-item" @click="deleteSelectedItems">
              <img
                :src="props.isDarkTheme ? DeleteNightIcon : DeleteDayIcon"
                class="delete-icon"
              />
              {{ `删除选中的 ${selectedFiles.size} 个项目` }}
            </div>
          </template>
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

.dark-menu .folder-icon,
.dark-menu .upload-icon,
.dark-menu .home-icon,
.dark-menu .refresh-icon,
.dark-menu .delete-icon,
.dark-menu .download-icon,
.dark-menu .plus-icon,
.dark-menu .back-icon,
.dark-menu .edit-icon,
.dark-menu .openfolder-icon {
  opacity: 1;
}

.folder-icon,
.upload-icon,
.home-icon,
.refresh-icon,
.delete-icon,
.download-icon,
.plus-icon,
.back-icon,
.edit-icon,
.openfolder-icon {
  width: 20px;
  height: 20px;
  margin-right: 8px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.dark-theme .folder-icon,
.dark-theme .upload-icon,
.dark-theme .home-icon,
.dark-theme .refresh-icon,
.dark-theme .delete-icon,
.dark-theme .download-icon,
.dark-theme .plus-icon,
.dark-theme .edit-icon {
  opacity: 1;
}

.menu-item:hover .folder-icon,
.menu-item:hover .upload-icon,
.menu-item:hover .home-icon,
.menu-item:hover .refresh-icon,
.menu-item:hover .delete-icon,
.menu-item:hover .download-icon,
.menu-item:hover .plus-icon,
.menu-item:hover .edit-icon {
  opacity: 1;
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

.success-message {
  margin: 10px;
  padding: 10px;
  background-color: #4caf50;
  color: #ffffff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close-success {
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
  max-width: 300px;
  max-height: calc(100vh - 20px); /* 限制最大高度，避免超出屏幕 */
  overflow-y: auto; /* 添加垂直滚动 */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  padding: 4px 0;
  user-select: none; /* 防止文本被选中 */
}

.context-menu.dark-theme {
  background-color: #333333;
  border: 1px solid #444444;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

/* 自定义滚动条样式 */
.context-menu::-webkit-scrollbar {
  width: 6px;
}

.context-menu::-webkit-scrollbar-track {
  background: transparent;
}

.context-menu::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
}

.dark-theme.context-menu::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

.menu-item {
  padding: 10px 15px;
  display: flex;
  align-items: center;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

/* 删除进度条样式 */
.delete-progress {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  max-width: 90%;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  padding: 12px;
  z-index: 2000;
}

.dark-theme .delete-progress {
  background-color: #333333;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.progress-counter {
  margin-left: 10px;
  font-weight: bold;
}

.progress-bar-container {
  height: 6px;
  background-color: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
}

.dark-theme .progress-bar-container {
  background-color: #555555;
}

.progress-bar {
  height: 100%;
  background-color: #4caf50;
  transition: width 0.3s ease;
}

.dark-theme .progress-bar {
  background-color: #4caf50;
}

/* 删除菜单项样式 */
.delete-menu-item {
  color: #f44336;
}

.dark-theme .delete-menu-item {
  color: #ff6b6b;
}

.delete-menu-item:hover {
  background-color: rgba(244, 67, 54, 0.1);
}

.dark-theme .delete-menu-item:hover {
  background-color: rgba(255, 107, 107, 0.1);
}
</style> 