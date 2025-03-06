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

// 文件传输类型
type TransferType = 'upload' | 'download'

// 文件传输项
interface TransferItem {
  id: string
  filename: string
  path: string
  type: TransferType
  size: number
  transferred: number
  progress: number
  status: 'pending' | 'transferring' | 'verifying' | 'completed' | 'error' | 'cancelled'
  error?: string
  removeTimer?: number // 添加移除计时器ID
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

// 文件传输进度状态
const transferProgress = ref<TransferItem[]>([])
// 是否显示传输进度浮窗
const showTransferProgress = ref(false)
// 传输浮窗位置
const transferWindowPosition = ref({ x: 20, y: 20 })
// 是否正在拖动传输浮窗
const isDraggingTransferWindow = ref(false)
// 拖动初始位置
const dragStartPosition = ref({ x: 0, y: 0, windowX: 0, windowY: 0 })
// 传输浮窗是否折叠
const isTransferWindowCollapsed = ref(false)
// 最近传输的文件历史
const recentTransfers = ref<{id: string, filename: string, type: TransferType, status: string}[]>([])
// 在没有显示传输窗口时显示的最新传输提示
const latestTransferNotification = ref<{message: string, type: 'success' | 'error' | 'info', visible: boolean}>({
  message: '',
  type: 'info',
  visible: false
})
// 最新传输提示计时器
let latestTransferNotificationTimer: number | null = null

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
    // 成功通知由传输事件处理，此处不再显示
  } catch (err: any) {
    error.value = err.message || '下载文件时发生错误'
  }
}

// 上传文件
const uploadFiles = async (targetPath?: string) => {
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
      // 使用传入的目标路径或当前路径
      const uploadPath = targetPath || currentPath.value
      
      // 启动所有文件上传
      for (const filePath of result.filePaths) {
        try {
          await window.api.sftpUploadFile({
            connectionId: props.connectionId,
            localPath: filePath,
            remotePath: uploadPath
          })
          // 成功通知由传输事件处理，此处不再显示
        } catch (err) {
          console.error(`上传文件 ${filePath} 时发生错误:`, err)
        }
      }
    }
  } catch (err: any) {
    error.value = err.message || '上传文件时发生错误'
  }
}

// 上传文件到指定文件夹
const handleUploadToFolder = async (e: MouseEvent) => {
  e.preventDefault()
  if (clickedItem.value) {
    const targetPath = `${currentPath.value}/${clickedItem.value}`
    await uploadFiles(targetPath)
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

// 监听传输进度变化，确保上传完成后刷新文件列表
watch(transferProgress, (newProgress, oldProgress) => {
  // 检查是否有新完成的上传
  for (let i = 0; i < newProgress.length; i++) {
    const newItem = newProgress[i]
    const oldItem = oldProgress[i]
    
    // 如果是上传项，且状态从transferring变为completed或verifying
    if (newItem && oldItem && 
        newItem.type === 'upload' && 
        oldItem.status === 'transferring' && 
        (newItem.status === 'completed' || newItem.status === 'verifying')) {
      console.log('检测到上传完成状态变化，刷新文件列表')
      loadCurrentDirectory()
      break
    }
  }
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
  
  // 确保传输浮窗在可视区域内
  if (showTransferProgress.value) {
    adjustTransferWindowPosition()
  }
}

// 调整传输浮窗位置，确保在可视区域内
const adjustTransferWindowPosition = () => {
  const container = document.querySelector('.file-list-container') as HTMLElement
  if (!container) return
  
  const containerRect = container.getBoundingClientRect()
  const transferWindow = document.querySelector('.transfer-progress-modal') as HTMLElement
  if (!transferWindow) return
  
  const transferRect = transferWindow.getBoundingClientRect()
  
  let newX = transferWindowPosition.value.x
  let newY = transferWindowPosition.value.y
  
  // 确保不超出右边界
  if (newX + transferRect.width > containerRect.width) {
    newX = containerRect.width - transferRect.width - 10
  }
  
  // 确保不超出左边界
  if (newX < 10) {
    newX = 10
  }
  
  // 确保不超出下边界
  if (newY + transferRect.height > containerRect.height) {
    newY = containerRect.height - transferRect.height - 10
  }
  
  // 确保不超出上边界
  if (newY < 10) {
    newY = 10
  }
  
  transferWindowPosition.value = { x: newX, y: newY }
}

// 开始拖动传输浮窗
const startDragTransferWindow = (e: MouseEvent) => {
  // 如果点击的是按钮等控件，不启动拖动
  if ((e.target as HTMLElement).closest('.transfer-close-btn, .transfer-toggle-btn, .transfer-cancel-btn')) {
    return
  }
  
  isDraggingTransferWindow.value = true
  dragStartPosition.value = {
    x: e.clientX,
    y: e.clientY,
    windowX: transferWindowPosition.value.x,
    windowY: transferWindowPosition.value.y
  }
  
  document.addEventListener('mousemove', dragTransferWindow)
  document.addEventListener('mouseup', stopDragTransferWindow)
  
  // 防止选中文本
  e.preventDefault()
}

// 拖动传输浮窗
const dragTransferWindow = (e: MouseEvent) => {
  if (!isDraggingTransferWindow.value) return
  
  const deltaX = e.clientX - dragStartPosition.value.x
  const deltaY = e.clientY - dragStartPosition.value.y
  
  transferWindowPosition.value = {
    x: dragStartPosition.value.windowX + deltaX,
    y: dragStartPosition.value.windowY + deltaY
  }
  
  // 边界检查
  adjustTransferWindowPosition()
}

// 停止拖动传输浮窗
const stopDragTransferWindow = () => {
  isDraggingTransferWindow.value = false
  document.removeEventListener('mousemove', dragTransferWindow)
  document.removeEventListener('mouseup', stopDragTransferWindow)
}

// 切换传输浮窗折叠状态
const toggleTransferWindowCollapse = () => {
  isTransferWindowCollapsed.value = !isTransferWindowCollapsed.value
}

// 显示传输完成提示（当传输窗口未显示时）
const showTransferNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
  // 如果传输窗口已显示，则不显示额外通知
  if (showTransferProgress.value) return
  
  // 清除之前的计时器
  if (latestTransferNotificationTimer !== null) {
    clearTimeout(latestTransferNotificationTimer)
  }
  
  // 设置新通知
  latestTransferNotification.value = {
    message,
    type,
    visible: true
  }
  
  // 5秒后自动清除
  latestTransferNotificationTimer = window.setTimeout(() => {
    latestTransferNotification.value.visible = false
    latestTransferNotificationTimer = null
  }, 5000)
}

// 文件传输处理
const initFileTransferHandlers = () => {
  // 开始传输事件
  const unsubTransferStart = window.api.onTransferStart((data) => {
    // 添加到传输列表
    transferProgress.value.push({
      id: data.id,
      filename: data.filename,
      path: data.path, 
      type: data.type,
      size: data.size,
      transferred: 0,
      progress: 0,
      status: 'transferring'
    })
    
    // 显示传输进度浮窗
    showTransferProgress.value = true
  })
  
  // 传输进度更新事件
  const unsubTransferProgress = window.api.onTransferProgress((data) => {
    // 查找对应的传输项
    const transferItem = transferProgress.value.find(item => item.id === data.id)
    if (transferItem) {
      transferItem.transferred = data.transferred
      transferItem.progress = data.progress
      
      // 当上传进度达到100%时立即刷新文件列表
      if (transferItem.type === 'upload' && data.progress === 100 && transferItem.status === 'transferring') {
        console.log('上传进度达到100%，立即刷新文件列表')
        loadCurrentDirectory()
      }
    }
  })
  
  // 传输完成事件
  const unsubTransferComplete = window.api.onTransferComplete((data) => {
    // 查找对应的传输项
    const transferItem = transferProgress.value.find(item => item.id === data.id)
    if (transferItem) {
      // 设置为验证中状态
      transferItem.status = 'verifying'
      transferItem.progress = 100
      transferItem.transferred = transferItem.size // 确保进度显示为100%
      
      // 对于上传操作，立即刷新文件列表，不等待验证完成
      if (transferItem.type === 'upload') {
        console.log('上传完成，立即刷新文件列表')
        loadCurrentDirectory()
      }
      
      // 验证文件是否成功上传/下载
      verifyTransferSuccess(transferItem).then(success => {
        if (success) {
          // 更新为完成状态
          transferItem.status = 'completed'
          
          // 显示成功消息
          showSuccessMessage(`${transferItem.type === 'upload' ? '上传' : '下载'}文件 ${transferItem.filename} 成功`)
          
          // 添加到最近传输历史
          addToRecentTransfers(transferItem.id, transferItem.filename, transferItem.type, 'completed')
          
          // 如果传输窗口没有显示，则显示通知
          if (!showTransferProgress.value) {
            showTransferNotification(`${transferItem.type === 'upload' ? '上传' : '下载'}文件 ${transferItem.filename} 成功`, 'success')
          }
          
          // 设置自动移除计时器，完成后3秒移除（比原来快一些）
          scheduleItemRemoval(transferItem, 3000)
        } else {
          // 验证失败，标记为错误
          transferItem.status = 'error'
          transferItem.error = '文件传输验证失败'
          
          // 显示错误消息
          error.value = `${transferItem.type === 'upload' ? '上传' : '下载'}文件 ${transferItem.filename} 验证失败`
          
          // 添加到最近传输历史
          addToRecentTransfers(transferItem.id, transferItem.filename, transferItem.type, 'error')
          
          // 如果传输窗口没有显示，则显示通知
          if (!showTransferProgress.value) {
            showTransferNotification(`${transferItem.type === 'upload' ? '上传' : '下载'}文件 ${transferItem.filename} 验证失败`, 'error')
          }
          
          // 设置自动移除计时器
          scheduleItemRemoval(transferItem, 8000)
        }
        
        // 无论是上传还是下载都刷新当前目录
        loadCurrentDirectory()
      }).catch(err => {
        console.error(`验证传输 ${transferItem.filename} 失败:`, err)
        
        // 更新为错误状态
        transferItem.status = 'error'
        transferItem.error = `验证失败: ${err.message || '未知错误'}`
        
        // 显示错误消息
        error.value = `${transferItem.type === 'upload' ? '上传' : '下载'}文件 ${transferItem.filename} 验证失败: ${err.message || '未知错误'}`
        
        // 添加到最近传输历史
        addToRecentTransfers(transferItem.id, transferItem.filename, transferItem.type, 'error')
        
        // 刷新当前目录
        loadCurrentDirectory()
        
        // 设置自动移除计时器
        scheduleItemRemoval(transferItem, 8000)
      })
    }
    
    // 检查是否所有传输都已完成
    checkTransferComplete()
  })
  
  // 传输错误事件
  const unsubTransferError = window.api.onTransferError((data) => {
    // 查找对应的传输项
    const transferItem = transferProgress.value.find(item => item.id === data.id)
    if (transferItem) {
      transferItem.status = 'error'
      transferItem.error = data.error
      
      // 显示错误消息
      error.value = `${transferItem.type === 'upload' ? '上传' : '下载'}文件 ${transferItem.filename} 失败: ${data.error}`
      
      // 添加到最近传输历史
      addToRecentTransfers(transferItem.id, transferItem.filename, transferItem.type, 'error')
      
      // 刷新当前目录，以防文件状态不一致
      loadCurrentDirectory()
      
      // 如果传输窗口没有显示，则显示通知
      if (!showTransferProgress.value) {
        showTransferNotification(`${transferItem.type === 'upload' ? '上传' : '下载'}文件 ${transferItem.filename} 失败`, 'error')
      }
      
      // 设置自动移除计时器，错误状态保留较长时间（8秒）以便用户查看
      scheduleItemRemoval(transferItem, 8000)
    }
    
    // 检查是否所有传输都已完成
    checkTransferComplete()
  })
  
  // 传输取消事件
  const unsubTransferCancelled = window.api.onTransferCancelled((data) => {
    // 查找对应的传输项
    const transferItem = transferProgress.value.find(item => item.id === data.id)
    if (transferItem) {
      transferItem.status = 'cancelled'
      transferItem.error = '用户取消传输'
      
      // 添加到最近传输历史
      addToRecentTransfers(transferItem.id, transferItem.filename, transferItem.type, 'cancelled')
      
      // 刷新当前目录，以防文件状态不一致
      loadCurrentDirectory()
      
      // 设置自动移除计时器，取消状态保留较短时间（2秒）
      scheduleItemRemoval(transferItem, 2000)
    }
    
    // 检查是否所有传输都已完成
    checkTransferComplete()
  })
  
  // 返回清理函数
  return () => {
    unsubTransferStart()
    unsubTransferProgress()
    unsubTransferComplete()
    unsubTransferError()
    unsubTransferCancelled()
  }
}

// 添加到最近传输历史
const addToRecentTransfers = (id: string, filename: string, type: TransferType, status: string) => {
  // 限制历史记录数量，保留最新的10条
  if (recentTransfers.value.length >= 10) {
    recentTransfers.value.shift() // 移除最旧的记录
  }
  
  // 添加新记录
  recentTransfers.value.push({
    id,
    filename,
    type,
    status
  })
}

// 为传输项设置自动移除计时器
const scheduleItemRemoval = (item: TransferItem, delay = 5000) => {
  // 清除之前可能存在的计时器
  if (item.removeTimer) {
    clearTimeout(item.removeTimer)
  }
  
  console.log(`安排移除传输项：${item.filename}，状态：${item.status}，延迟：${delay}ms`)
  
  // 设置新的计时器，默认5秒后自动移除（可自定义）
  item.removeTimer = window.setTimeout(() => {
    console.log(`执行移除传输项：${item.filename}，状态：${item.status}`)
    // 移除该项
    transferProgress.value = transferProgress.value.filter(i => i.id !== item.id)
    
    // 如果没有正在进行的传输，隐藏浮窗
    const hasActiveTransfers = transferProgress.value.some(
      i => i.status === 'pending' || i.status === 'transferring'
    )
    
    // 如果无正在传输的项，且所有项目都已移除，隐藏传输窗口
    if (!hasActiveTransfers && transferProgress.value.length === 0) {
      console.log('所有传输项已完成，隐藏传输窗口')
      setTimeout(() => {
        showTransferProgress.value = false
      }, 500) // 进一步减少等待时间，提升体验
    }
  }, delay)
}

// 清除所有传输项的计时器
const clearAllRemovalTimers = () => {
  transferProgress.value.forEach(item => {
    if (item.removeTimer) {
      clearTimeout(item.removeTimer)
      item.removeTimer = undefined
    }
  })
}

// 检查所有传输是否完成
const checkTransferComplete = () => {
  // 检查是否所有传输都已完成（没有处于进行中状态的传输）
  const allCompleted = !transferProgress.value.some(
    item => item.status === 'pending' || item.status === 'transferring'
  )
  
  // 如果全部完成，显示总结性消息
  if (allCompleted && transferProgress.value.length > 0) {
    // 计算成功、失败和取消的数量
    const completedCount = transferProgress.value.filter(item => item.status === 'completed').length
    const errorCount = transferProgress.value.filter(item => item.status === 'error').length
    const cancelledCount = transferProgress.value.filter(item => item.status === 'cancelled').length
    
    // 显示总结性消息
    if (completedCount > 0 || errorCount > 0 || cancelledCount > 0) {
      let message = '传输完成：'
      if (completedCount > 0) message += `${completedCount}个成功`
      if (errorCount > 0) message += `${completedCount > 0 ? '，' : ''}${errorCount}个失败`
      if (cancelledCount > 0) message += `${completedCount > 0 || errorCount > 0 ? '，' : ''}${cancelledCount}个已取消`
      
      showSuccessMessage(message)
      
      // 如果传输窗口没有显示，也显示通知
      if (!showTransferProgress.value) {
        showTransferNotification(message, completedCount > 0 ? 'success' : 'error')
      }
    }
  }
}

// 关闭传输进度浮窗
const closeTransferProgress = () => {
  showTransferProgress.value = false
  // 清除所有自动移除计时器
  clearAllRemovalTimers()
}

// 处理背景区域上传文件
const handleBackgroundUpload = async (e: MouseEvent) => {
  e.preventDefault()
  await uploadFiles()
}

// 取消文件传输
const cancelTransfer = async (transferId: string) => {
  try {
    // 查找对应的传输项
    const transferItem = transferProgress.value.find(item => item.id === transferId)
    if (!transferItem || transferItem.status !== 'transferring') {
      return
    }
    
    // 调用API取消传输
    const result = await window.api.cancelTransfer({
      transferId
    })
    
    if (result.success) {
      // 更新状态为已取消
      transferItem.status = 'cancelled'
      transferItem.error = '用户取消传输'
      
      // 显示提示
      showSuccessMessage(`已取消${transferItem.type === 'upload' ? '上传' : '下载'}文件: ${transferItem.filename}`)
      
      // 刷新文件列表
      loadCurrentDirectory()
      
      // 设置自动移除计时器
      scheduleItemRemoval(transferItem, 2000)
    } else {
      // 显示错误
      error.value = `取消传输失败: ${result.error || '未知错误'}`
    }
  } catch (err: any) {
    console.error('取消传输失败:', err)
    error.value = `取消传输失败: ${err.message || '未知错误'}`
  }
}

// 直接清除传输项
const clearTransferItem = (transferId: string) => {
  const transferItem = transferProgress.value.find(item => item.id === transferId)
  if (transferItem) {
    // 立即从列表中移除
    transferProgress.value = transferProgress.value.filter(item => item.id !== transferId)
    
    // 如果没有正在进行的传输和剩余项，隐藏传输窗口
    const hasActiveTransfers = transferProgress.value.some(
      i => i.status === 'pending' || i.status === 'transferring'
    )
    
    if (!hasActiveTransfers && transferProgress.value.length === 0) {
      showTransferProgress.value = false
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
  
  // 初始化文件传输事件监听
  const cleanupTransferHandlers = initFileTransferHandlers()
  
  // 组件卸载时清理监听器
  onBeforeUnmount(() => {
    cleanupTransferHandlers()
  })
})

// 组件卸载时移除事件监听
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('resize', handleWindowResize)
  
  // 清除计时器
  if (successMessageTimer !== null) {
    clearTimeout(successMessageTimer)
  }
  
  if (latestTransferNotificationTimer !== null) {
    clearTimeout(latestTransferNotificationTimer)
  }
  
  // 清除所有传输项的计时器
  clearAllRemovalTimers()
})

// 验证文件传输是否成功
const verifyTransferSuccess = async (item: TransferItem): Promise<boolean> => {
  try {
    console.log(`开始验证传输项: ${item.filename}`)
    
    // 根据传输类型确定验证方法
    if (item.type === 'upload') {
      // 上传验证：检查文件是否存在于远程目录
      // 构建完整的远程路径
      const remotePath = item.path.endsWith('/') 
        ? `${item.path}${item.filename}`
        : `${item.path}/${item.filename}`
      
      console.log(`验证上传文件: ${remotePath}`)
      
      // 尝试多次验证，有时文件可能需要一点时间才能在服务器上可见
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        // 通过SFTP读取目录来检查文件是否存在
        const result = await window.api.sftpReadDir({
          connectionId: props.connectionId,
          path: item.path
        })
        
        // 检查文件是否存在并获取其大小
        if (result.success && result.files) {
          const fileInfo = result.files.find(file => file.name === item.filename)
          
          if (fileInfo) {
            console.log(`验证结果: 文件存在, 大小: ${fileInfo.size}, 期望大小: ${item.size}`)
            
            // 验证文件大小是否与上传大小一致(允许5%的误差)
            const sizeMatch = Math.abs(fileInfo.size - item.size) <= (item.size * 0.05)
            
            // 如果验证成功，再次刷新文件列表确保显示
            if (sizeMatch && item.type === 'upload') {
              loadCurrentDirectory()
            }
            
            return sizeMatch
          }
        }
        
        // 如果没有找到文件，等待一段时间后重试
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`未找到文件，等待后重试 (${retryCount}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // 每次重试前都刷新一次目录
          if (item.type === 'upload') {
            loadCurrentDirectory()
          }
        }
      }
      
      console.log('验证失败: 文件不存在或无法访问')
      return false
    } else if (item.type === 'download') {
      // 下载验证：这里不需要特别验证，因为文件直接保存到本地文件系统
      // 本地文件系统的保存通常是由操作系统处理的，如果出错会有异常
      return true
    }
    
    return false
  } catch (err) {
    console.error(`验证传输失败:`, err)
    return false
  }
}
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
    
    <!-- 传输完成提示（当传输窗口未显示时） -->
    <div 
      v-if="latestTransferNotification.visible" 
      class="transfer-notification"
      :class="{ 
        'success': latestTransferNotification.type === 'success',
        'error': latestTransferNotification.type === 'error',
        'dark-theme': isDarkTheme 
      }"
    >
      {{ latestTransferNotification.message }}
      <button class="close-notification" @click="latestTransferNotification.visible = false">×</button>
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
            <span class="file-name-text" :title="file.name">{{ file.name }}</span>
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
        :class="{ 'dark-menu': props.isDarkTheme }"
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
          <div class="menu-item" @click="handleUploadToFolder">
            <img
              :src="props.isDarkTheme ? UploadNightIcon : UploadDayIcon"
              class="upload-icon"
            />
            上传到该文件夹
          </div>
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
          <div class="menu-item" @click="handleBackgroundUpload">
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
    
    <!-- 文件传输进度浮窗 -->
    <div 
      v-if="showTransferProgress && transferProgress.length > 0" 
      class="transfer-progress-modal"
      :class="{ 
        'dark-theme': props.isDarkTheme,
        'collapsed': isTransferWindowCollapsed
      }"
      :style="{ 
        left: `${transferWindowPosition.x}px`, 
        top: `${transferWindowPosition.y}px` 
      }"
    >
      <div 
        class="transfer-header"
        @mousedown="startDragTransferWindow"
      >
        <span class="transfer-title">文件传输</span>
        <div class="transfer-header-right">
          <button 
            class="transfer-toggle-btn" 
            @click="toggleTransferWindowCollapse"
            :title="isTransferWindowCollapsed ? '展开' : '折叠'"
          >
            {{ isTransferWindowCollapsed ? '＋' : '－' }}
          </button>
          <span v-if="!isTransferWindowCollapsed" class="transfer-count">{{ transferProgress.length }}个任务</span>
          <button class="transfer-close-btn" @click="closeTransferProgress">×</button>
        </div>
      </div>
      
      <div v-if="!isTransferWindowCollapsed" class="transfer-items">
        <div 
          v-for="item in transferProgress" 
          :key="item.id" 
          class="transfer-item"
          :class="{
            'completed': item.status === 'completed',
            'error': item.status === 'error',
            'cancelled': item.status === 'cancelled'
          }"
        >
          <div class="transfer-item-header">
            <span class="transfer-filename" :title="item.filename">{{ item.filename }}</span>
            <div class="transfer-actions">
              <span class="transfer-type">{{ item.type === 'upload' ? '上传' : '下载' }}</span>
              <button 
                v-if="item.status === 'transferring'" 
                class="transfer-cancel-btn"
                @click="cancelTransfer(item.id)"
                title="取消传输"
              >
                ✕
              </button>
              <span 
                v-else-if="item.status === 'completed'" 
                class="transfer-status-indicator completed"
                title="传输完成"
              >
                ✓
              </span>
              <span 
                v-else-if="item.status === 'verifying'" 
                class="transfer-status-indicator verifying"
                title="正在验证"
              >
                ⟳
              </span>
              <span 
                v-else-if="item.status === 'error'" 
                class="transfer-status-indicator error"
                title="传输失败"
              >
                !
              </span>
              <span 
                v-else-if="item.status === 'cancelled'" 
                class="transfer-status-indicator cancelled"
                title="已取消"
              >
                -
              </span>
              <!-- 添加清除按钮，仅对于非传输中和非验证中状态显示 -->
              <button 
                v-if="item.status !== 'transferring' && item.status !== 'verifying'" 
                class="transfer-clear-btn"
                @click="clearTransferItem(item.id)"
                title="清除此项"
              >
                ×
              </button>
            </div>
          </div>
          
          <div class="transfer-info">
            <span class="transfer-size">
              {{ formatFileSize(item.transferred) }} / {{ formatFileSize(item.size) }}
            </span>
            <span class="transfer-progress-text" :class="{ 
              'completed': item.status === 'completed',
              'verifying': item.status === 'verifying'
            }">
              {{ item.status === 'completed' ? '已完成' : 
                 (item.status === 'verifying' ? '验证中' : 
                  (item.status === 'error' ? '失败' : 
                   (item.status === 'cancelled' ? '已取消' : `${item.progress}%`))) }}
            </span>
          </div>
          
          <div class="progress-bar-container">
            <div 
              class="progress-bar" 
              :style="{ width: `${item.progress}%` }"
              :class="{
                'completed': item.status === 'completed',
                'verifying': item.status === 'verifying',
                'error': item.status === 'error',
                'cancelled': item.status === 'cancelled',
                'progress-animation': item.progress === 100 && item.status === 'completed',
                'verifying-animation': item.status === 'verifying'
              }"
            ></div>
          </div>
          
          <div v-if="item.status === 'error'" class="transfer-error">
            {{ item.error }}
          </div>
          
          <div v-if="item.status === 'cancelled'" class="transfer-cancelled">
            已取消传输
          </div>
        </div>
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
.dark-theme .back-icon,
.dark-theme .edit-icon,
.dark-theme .openfolder-icon {
  opacity: 1;
}

.menu-item:hover .folder-icon,
.menu-item:hover .upload-icon,
.menu-item:hover .home-icon,
.menu-item:hover .refresh-icon,
.menu-item:hover .delete-icon,
.menu-item:hover .download-icon,
.menu-item:hover .plus-icon,
.menu-item:hover .back-icon,
.menu-item:hover .edit-icon,
.menu-item:hover .openfolder-icon {
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

/* 传输完成提示样式 */
.transfer-notification {
  position: fixed;
  bottom: 20px;
  right: 20px;
  padding: 12px 16px;
  border-radius: 4px;
  background-color: #2196f3;
  color: #ffffff;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 250px;
  max-width: 400px;
  animation: notification-slide-in 0.3s ease-out;
}

.transfer-notification.success {
  background-color: #4caf50;
}

.transfer-notification.error {
  background-color: #f44336;
}

.dark-theme .transfer-notification {
  background-color: #1565c0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.dark-theme .transfer-notification.success {
  background-color: #2e7d32;
}

.dark-theme .transfer-notification.error {
  background-color: #c62828;
}

@keyframes notification-slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.close-notification {
  background: none;
  border: none;
  color: #ffffff;
  font-size: 18px;
  cursor: pointer;
  padding: 0 0 0 16px;
  margin-left: 10px;
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
  min-width: 0;
}

.file-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.file-name-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  background-color: #f5f5f5;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  min-width: 180px;
  max-width: 300px;
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
.dark-menu {
  background-color: #222;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}

.dark-menu .menu-separator {
  background-color: var(--separator-color, rgba(255, 255, 255, 0.06));
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
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-item:not(:last-child) {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.dark-menu .menu-item:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.menu-item:hover {
  background-color: rgba(0, 0, 0, 0.07);
}

.dark-menu .menu-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.menu-item.delete-menu-item,
.menu-item.delete {
  color: var(--delete-color, #f44336);
}

/* 确保夜间模式下禁用项的样式 */
.menu-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.dark-menu .menu-item.disabled {
  opacity: 0.4;
}

.menu-icon {
  margin-right: 10px;
  font-size: 16px;
  width: 20px;
  text-align: center;
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

.progress-bar.error {
  background-color: #f44336;
}

.dark-theme .progress-bar {
  background-color: #4caf50;
}

.dark-theme .progress-bar.error {
  background-color: #f44336;
}

/* 文件传输进度浮窗样式 */
.transfer-progress-modal {
  position: absolute;
  width: 400px;
  max-width: 90%;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 10000;
  transition: width 0.3s, height 0.3s;
}

.dark-theme .transfer-progress-modal {
  background-color: #333333;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

/* 折叠状态 */
.transfer-progress-modal.collapsed {
  width: 220px;
  height: auto;
}

.transfer-header {
  background-color: #f5f5f5;
  padding: 10px 15px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
}

.dark-theme .transfer-header {
  background-color: #444444;
  border-bottom-color: #555555;
}

.transfer-title {
  font-weight: 600;
  font-size: 14px;
  color: #333333;
}

.dark-theme .transfer-title {
  color: #ffffff;
}

.transfer-count {
  color: #666666;
  font-size: 12px;
  margin-right: 10px;
}

.dark-theme .transfer-count {
  color: #aaaaaa;
}

.transfer-items {
  padding: 10px;
  overflow-y: auto;
  max-height: 320px;
}

.transfer-item {
  margin-bottom: 15px;
  background-color: #f9f9f9;
  border-radius: 4px;
  padding: 10px;
  border-left: 3px solid #4caf50;
}

.dark-theme .transfer-item {
  background-color: #3a3a3a;
  border-left-color: #4caf50;
}

.transfer-item.completed {
  border-left-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.dark-theme .transfer-item.completed {
  border-left-color: #4caf50;
  background-color: rgba(76, 175, 80, 0.2);
}

.transfer-item.error {
  border-left-color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
}

.dark-theme .transfer-item.error {
  border-left-color: #f44336;
  background-color: rgba(244, 67, 54, 0.2);
}

.transfer-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.transfer-filename {
  font-weight: 500;
  color: #333333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.dark-theme .transfer-filename {
  color: #ffffff;
}

.transfer-type {
  font-size: 11px;
  color: #666666;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 6px;
  border-radius: 10px;
}

.dark-theme .transfer-type {
  color: #cccccc;
  background-color: rgba(255, 255, 255, 0.1);
}

.transfer-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.transfer-size {
  color: #666666;
}

.dark-theme .transfer-size {
  color: #aaaaaa;
}

.transfer-progress-text {
  font-weight: 500;
  color: #333333;
}

.dark-theme .transfer-progress-text {
  color: #ffffff;
}

.transfer-error {
  color: #f44336;
  font-size: 12px;
  margin-top: 8px;
}

.transfer-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transfer-close-btn {
  background: none;
  border: none;
  color: #666666;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
}

.dark-theme .transfer-close-btn {
  color: #aaaaaa;
}

.transfer-toggle-btn {
  background: none;
  border: none;
  color: #666666;
  font-size: 16px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  text-align: center;
}

.dark-theme .transfer-toggle-btn {
  color: #aaaaaa;
}

.transfer-item.cancelled {
  border-left-color: #9e9e9e;
  background-color: rgba(158, 158, 158, 0.1);
}

.dark-theme .transfer-item.cancelled {
  border-left-color: #9e9e9e;
  background-color: rgba(158, 158, 158, 0.2);
}

.transfer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.transfer-cancel-btn {
  background: none;
  border: none;
  color: #f44336;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.transfer-cancel-btn:hover {
  background-color: rgba(244, 67, 54, 0.1);
}

.dark-theme .transfer-cancel-btn {
  color: #ff7043;
}

.dark-theme .transfer-cancel-btn:hover {
  background-color: rgba(255, 112, 67, 0.2);
}

.progress-bar.cancelled {
  background-color: #9e9e9e;
}

.dark-theme .progress-bar.cancelled {
  background-color: #757575;
}

.transfer-cancelled {
  color: #757575;
  font-size: 12px;
  margin-top: 8px;
}

.dark-theme .transfer-cancelled {
  color: #aaaaaa;
}

.transfer-status-indicator {
  font-size: 16px;
  margin-left: 5px;
}

.transfer-status-indicator.completed {
  color: #4caf50;
}

.transfer-status-indicator.error {
  color: #f44336;
}

.transfer-status-indicator.cancelled {
  color: #9e9e9e;
}

.transfer-status-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  margin-left: 5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
}

.transfer-status-indicator.completed {
  color: #4caf50;
  background-color: rgba(76, 175, 80, 0.1);
}

.transfer-status-indicator.error {
  color: #f44336;
  background-color: rgba(244, 67, 54, 0.1);
}

.transfer-status-indicator.cancelled {
  color: #9e9e9e;
  background-color: rgba(158, 158, 158, 0.1);
}

.transfer-clear-btn {
  background: none;
  border: none;
  color: #9e9e9e;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  margin-left: 5px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.transfer-clear-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: #666;
}

.dark-theme .transfer-clear-btn {
  color: #aaa;
}

.dark-theme .transfer-clear-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #ddd;
}

/* 动画 */
.progress-bar.progress-animation {
  animation: pulse-success 1.5s ease-in-out;
}

@keyframes pulse-success {
  0% { background-color: #4caf50; }
  50% { background-color: #81c784; }
  100% { background-color: #4caf50; }
}

.dark-theme .progress-bar.progress-animation {
  animation: pulse-success-dark 1.5s ease-in-out;
}

@keyframes pulse-success-dark {
  0% { background-color: #2e7d32; }
  50% { background-color: #4caf50; }
  100% { background-color: #2e7d32; }
}

.transfer-progress-text.completed {
  color: #4caf50;
  font-weight: bold;
}

.dark-theme .transfer-progress-text.completed {
  color: #81c784;
}

/* 添加验证中状态的CSS样式 */
.transfer-status-indicator.verifying {
  color: #2196f3;
  background-color: rgba(33, 150, 243, 0.1);
  animation: rotate 1.5s linear infinite;
}

.transfer-progress-text.verifying {
  color: #2196f3;
  font-weight: 500;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 添加验证中进度条的样式 */
.progress-bar.verifying {
  background-color: #2196f3;
}

.progress-bar.verifying-animation {
  animation: pulse-verifying 2s ease-in-out infinite;
  background-image: linear-gradient(
    -45deg,
    rgba(33, 150, 243, 0.8) 25%,
    rgba(33, 150, 243, 1) 50%,
    rgba(33, 150, 243, 0.8) 75%
  );
  background-size: 200% 100%;
  transition: background-position 0.5s ease-out;
}

@keyframes pulse-verifying {
  0% { background-position: 100% 0%; }
  100% { background-position: 0% 0%; }
}

.dark-theme .progress-bar.verifying {
  background-color: #1976d2;
}
</style> 