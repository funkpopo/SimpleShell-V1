<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useI18n } from '../i18n'

// 导入图标资源
import historyDayIcon from '../assets/history-day.svg'
import historyNightIcon from '../assets/history-night.svg'
import minimizeDayIcon from '../assets/minimize-day.svg'
import minimizeNightIcon from '../assets/minimize-night.svg'
import closeDayIcon from '../assets/close-day.svg'
import closeNightIcon from '../assets/close-night.svg'

// 使用i18n
const { t } = useI18n()

// 定义Props
const props = defineProps<{
  visible: boolean
  isDarkTheme: boolean
}>()

// 动态图标计算属性
const historyIcon = computed(() => props.isDarkTheme ? historyNightIcon : historyDayIcon)
const minimizeIcon = computed(() => props.isDarkTheme ? minimizeNightIcon : minimizeDayIcon)
const closeIcon = computed(() => props.isDarkTheme ? closeNightIcon : closeDayIcon)

// 定义事件
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'close'): void
}>()

// 浮窗位置
const posX = ref(window.innerWidth - 350)  // 默认放置在右侧
const posY = ref(80)  // 距离顶部80px
const startX = ref(0)
const startY = ref(0)
const isDragging = ref(false)

// 窗口尺寸（仅在开始拖拽时获取一次）
const windowDimensions = ref({
  windowWidth: 0,
  windowHeight: 0,
  floatingWidth: 320,
  floatingHeight: 450
})

// 浮窗状态
const showHistory = ref(false)

// 对话内容
const messages = ref<Array<{
  type: 'user' | 'assistant'
  content: string
  timestamp: number
}>>([])

// 历史会话列表
const historySessions = ref<Array<{
  id: string
  title: string
  preview: string
  timestamp: number
  messages: Array<{
    type: 'user' | 'assistant'
    content: string
    timestamp: number
  }>
}>>([])

// 当前会话ID
const currentSessionId = ref('')

// 用户输入
const userInput = ref('')

// 加载状态
const isLoading = ref(false)

// 本地存储密钥
const STORAGE_KEY = 'ai_assistant_messages'
const POSITION_STORAGE_KEY = 'ai_assistant_position'

// 示例回答集
const sampleResponses = [
  '我理解您的问题。在Shell环境中，您可以使用以下命令查看当前目录下的文件：\n```\nls -la\n```',
  '根据您的描述，这看起来像是一个权限问题。您可以尝试使用sudo命令，或者检查文件的权限设置：\n```\nchmod +x yourscript.sh\n```',
  '对于这个网络连接问题，我建议您首先检查网络配置：\n```\nifconfig\nping google.com\n```\n如果无法ping通，可能是DNS或网关设置问题。',
  '这个错误通常表示端口已被占用。您可以使用以下命令查找占用该端口的进程：\n```\nlsof -i :8080\n```\n然后使用kill命令终止该进程。',
  '如果您需要查看系统资源使用情况，可以使用这些命令：\n```\ntop\nhtop\nfree -m\n```\n这将显示CPU、内存和进程的详细信息。',
  '要建立SSH连接，您可以使用以下命令：\n```\nssh username@hostname -p 22\n```\n如果您有密钥，可以添加 `-i /path/to/key.pem` 参数。'
]

// 浮窗样式
const floatingWindowStyle = computed(() => {
  return {
    transform: `translate3d(${posX.value}px, ${posY.value}px, 0)`
  }
})

// 开始拖拽
const startDrag = (e: MouseEvent) => {
  // 仅允许通过标题栏拖拽
  if ((e.target as HTMLElement).closest('.window-header')) {
    isDragging.value = true
    startX.value = e.clientX - posX.value
    startY.value = e.clientY - posY.value
    
    // 获取窗口和浮窗尺寸（只在开始拖拽时获取一次）
    const floatingWindow = document.querySelector('.ai-floating-window') as HTMLElement
    windowDimensions.value = {
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      floatingWidth: floatingWindow?.offsetWidth || 320,
      floatingHeight: floatingWindow?.offsetHeight || 450
    }
  }
}

// 拖拽中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return
  
  // 使用requestAnimationFrame优化动画
  requestAnimationFrame(() => {
    // 计算新位置
    let newX = e.clientX - startX.value
    let newY = e.clientY - startY.value
    
    const { windowWidth, windowHeight, floatingWidth } = windowDimensions.value
    
    // 增强的边界检测，确保至少有20px在视口内
    const minVisiblePortion = 40
    newX = Math.max(-floatingWidth + minVisiblePortion, newX)
    newY = Math.max(0, newY)
    newX = Math.min(windowWidth - minVisiblePortion, newX)
    newY = Math.min(windowHeight - minVisiblePortion, newY)
    
    // 更新位置
    posX.value = newX
    posY.value = newY
  })
}

// 结束拖拽
const endDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    
    // 额外的安全检查，确保窗口在可视区域内
    ensureWindowVisible()
    
    // 保存位置到localStorage
    saveWindowPosition()
    
    // 清除不再需要的参考数据
    windowDimensions.value = {
      windowWidth: 0,
      windowHeight: 0,
      floatingWidth: 320,
      floatingHeight: 450
    }
  }
}

// 确保窗口可见
const ensureWindowVisible = () => {
  const windowWidth = window.innerWidth
  const windowHeight = window.innerHeight
  const floatingWindow = document.querySelector('.ai-floating-window') as HTMLElement
  
  if (floatingWindow) {
    const floatingWidth = floatingWindow.offsetWidth
    const floatingHeight = floatingWindow.offsetHeight
    
    // 确保至少有100px的窗口在视口内
    const minVisiblePortion = 100
    
    // 检查并修正X位置
    if (posX.value < -floatingWidth + minVisiblePortion) {
      posX.value = -floatingWidth + minVisiblePortion
    } else if (posX.value > windowWidth - minVisiblePortion) {
      posX.value = windowWidth - minVisiblePortion
    }
    
    // 检查并修正Y位置
    if (posY.value < 0) {
      posY.value = 0
    } else if (posY.value > windowHeight - floatingHeight + minVisiblePortion) {
      posY.value = windowHeight - floatingHeight + minVisiblePortion
    }
  }
}

// 保存窗口位置
const saveWindowPosition = () => {
  try {
    localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify({
      x: posX.value,
      y: posY.value
    }))
  } catch (error) {
    console.error('保存窗口位置失败:', error)
  }
}

// 加载窗口位置
const loadWindowPosition = () => {
  try {
    const savedPosition = localStorage.getItem(POSITION_STORAGE_KEY)
    if (savedPosition) {
      const position = JSON.parse(savedPosition)
      posX.value = position.x
      posY.value = position.y
      
      // 确保加载的位置有效且在可视区域内
      setTimeout(ensureWindowVisible, 0)
    }
  } catch (error) {
    console.error('加载窗口位置失败:', error)
  }
}

// 监听窗口大小变化，确保浮窗位置有效
const handleResize = () => {
  // 如果不是正在拖拽，才执行自动调整
  if (!isDragging.value) {
    ensureWindowVisible()
  }
}

// 添加全局事件监听
onMounted(async () => {
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', endDrag)
  window.addEventListener('resize', handleResize)
  
  // 向主进程注册窗口关闭事件监听
  window.api.onAppClose(async () => {
    await saveCurrentSession()
    saveWindowPosition()
  })
  
  // 加载消息历史
  await loadMessages()
  
  // 加载窗口位置
  loadWindowPosition()
})

// 清理全局事件
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  window.removeEventListener('resize', handleResize)
  
  // 保存当前会话
  saveCurrentSession()
})

// 监听消息变化，保存历史到localStorage
watch(messages, () => {
  saveMessagesToLocalStorage()
}, { deep: true })

// 关闭窗口
const closeWindow = async () => {
  // 保存当前会话
  await saveCurrentSession()
  
  // 重置消息
  messages.value = []
  localStorage.removeItem(STORAGE_KEY)
  
  // 关闭窗口
  emit('update:visible', false)
  emit('close')
}

// 获取随机回答
const getRandomResponse = (question: string): string => {
  // 简单关键词匹配
  if (question.includes('你好') || question.includes('hi') || question.includes('hello')) {
    return '你好！我是AI助手，有什么可以帮助你的吗？'
  }
  
  if (question.includes('谢谢') || question.includes('感谢')) {
    return '不客气！如果还有其他问题，随时可以问我。'
  }
  
  // 返回随机示例回答
  return sampleResponses[Math.floor(Math.random() * sampleResponses.length)]
}

// 模拟AI思考时间
const getThinkingTime = (message: string): number => {
  // 根据消息长度计算思考时间
  const baseTime = 800
  const charTime = 15 // 每个字符增加的时间（毫秒）
  return Math.min(baseTime + message.length * charTime, 3000) // 最长3秒
}

// 发送消息
const sendMessage = () => {
  const message = userInput.value.trim()
  if (!message) return
  
  // 添加用户消息
  messages.value.push({
    type: 'user',
    content: message,
    timestamp: Date.now()
  })
  
  // 清空输入框
  userInput.value = ''
  
  // 滚动到底部
  scrollToBottom()
  
  // 模拟AI响应
  isLoading.value = true
  
  // 根据消息长度模拟思考时间
  const thinkingTime = getThinkingTime(message)
  
  setTimeout(() => {
    // 添加AI响应
    messages.value.push({
      type: 'assistant',
      content: getRandomResponse(message),
      timestamp: Date.now()
    })
    isLoading.value = false
    
    // 滚动到底部
    scrollToBottom()
  }, thinkingTime)
}

// 按键事件处理
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// 滚动到底部
const scrollToBottom = () => {
  setTimeout(() => {
    const messageContainer = document.querySelector('.messages-container')
    if (messageContainer) {
      messageContainer.scrollTop = messageContainer.scrollHeight
    }
  }, 50)
}

// 格式化时间戳
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

// 格式化日期
const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

// 监听可见性变化
watch(() => props.visible, (newValue) => {
  if (newValue) {
    // 当浮窗显示时，滚动到底部
    scrollToBottom()
  }
})

// 格式化消息，支持代码块和简单的Markdown
const formatMessage = (content: string): string => {
  if (!content) return ''
  
  // 处理代码块: ```code```
  content = content.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<div class="code-block"><pre>${escapeHtml(code.trim())}</pre></div>`
  })
  
  // 处理行内代码: `code`
  content = content.replace(/`([^`]+)`/g, '<code>$1</code>')
  
  // 处理换行符
  content = content.replace(/\n/g, '<br>')
  
  return content
}

// HTML转义
const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 最小化窗口
const minimizeWindow = () => {
  // 不清除会话内容，只隐藏窗口
  emit('update:visible', false)
}

// 切换历史记录面板
const toggleHistory = () => {
  showHistory.value = !showHistory.value
  if (showHistory.value) {
    loadHistorySessions()
  }
}

// 创建新会话
const createNewSession = () => {
  // 保存当前会话
  if (messages.value.length > 1) {
    saveCurrentSession()
  }
  
  // 创建新会话
  currentSessionId.value = generateSessionId()
  messages.value = [{
    type: 'assistant',
    content: t('aiAssistant.welcome'),
    timestamp: Date.now()
  }]
  
  showHistory.value = false
}

// 加载会话历史记录
const loadHistorySessions = async () => {
  try {
    // 通过IPC从主进程获取历史会话列表
    const history = await window.api.loadChatHistory()
    historySessions.value = history.sessions || []
  } catch (error) {
    console.error('加载历史会话失败:', error)
    historySessions.value = []
  }
}

// 选择历史会话
const selectHistorySession = (sessionId: string) => {
  // 保存当前会话
  if (messages.value.length > 1) {
    saveCurrentSession()
  }
  
  // 找到选中的历史会话
  const selectedSession = historySessions.value.find(session => session.id === sessionId)
  if (selectedSession) {
    currentSessionId.value = sessionId
    messages.value = [...selectedSession.messages]
    showHistory.value = false
    
    // 滚动到底部
    scrollToBottom()
  }
}

// 删除历史会话
const deleteHistorySession = async (sessionId: string, event: Event) => {
  event.stopPropagation() // 阻止事件冒泡
  
  try {
    await window.api.deleteHistorySession(sessionId)
    // 更新本地历史会话列表
    historySessions.value = historySessions.value.filter(session => session.id !== sessionId)
    
    // 如果删除的是当前会话，创建新会话
    if (sessionId === currentSessionId.value) {
      createNewSession()
    }
  } catch (error) {
    console.error('删除历史会话失败:', error)
  }
}

// 生成会话ID
const generateSessionId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

// 获取会话标题
const getSessionTitle = (messages: Array<{type: string, content: string, timestamp: number}>): string => {
  // 尝试从第一条用户消息获取标题
  const firstUserMsg = messages.find(msg => msg.type === 'user')
  if (firstUserMsg) {
    // 截取前20个字符作为标题
    return firstUserMsg.content.length > 20 
      ? firstUserMsg.content.substring(0, 20) + '...'
      : firstUserMsg.content
  }
  // 默认标题
  return '新对话'
}

// 保存当前会话到历史记录
const saveCurrentSession = async () => {
  if (messages.value.length <= 1) return // 仅有欢迎消息，不保存
  
  try {
    // 如果没有当前会话ID，生成一个
    if (!currentSessionId.value) {
      currentSessionId.value = generateSessionId()
    }
    
    const session = {
      id: currentSessionId.value,
      title: getSessionTitle(messages.value),
      preview: messages.value[messages.value.length - 1].content.substring(0, 50),
      timestamp: Date.now(),
      messages: [...messages.value]
    }
    
    // 通过IPC调用主进程保存会话
    await window.api.saveChatSession(session)
  } catch (error) {
    console.error('保存会话失败:', error)
  }
}

// 加载消息历史
const loadMessages = async () => {
  try {
    // 尝试从本地存储恢复临时会话
    const savedMessages = localStorage.getItem(STORAGE_KEY)
    if (savedMessages) {
      messages.value = JSON.parse(savedMessages)
      return
    }
    
    // 如果没有临时会话，创建新会话
    createNewSession()
  } catch (error) {
    console.error('加载AI对话历史失败:', error)
    // 添加欢迎消息
    createNewSession()
  }
}

// 保存临时消息历史到localStorage
const saveMessagesToLocalStorage = () => {
  try {
    // 保存临时会话到localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value))
  } catch (error) {
    console.error('保存AI对话历史到localStorage失败:', error)
  }
}
</script>

<template>
  <div 
    v-if="visible" 
    class="ai-floating-window" 
    :class="{ 'dark-theme': isDarkTheme }"
    :style="floatingWindowStyle"
    @mousedown="startDrag"
  >
    <!-- 窗口头部 -->
    <div class="window-header">
      <div class="window-title">{{ t('aiAssistant.title') }}</div>
      <div class="window-controls">
        <button class="window-btn history-btn" @click="toggleHistory">
          <img :src="historyIcon" alt="History" width="16" height="16">
        </button>
        <button class="window-btn minimize-btn" @click="minimizeWindow">
          <img :src="minimizeIcon" alt="Minimize" width="16" height="16">
        </button>
        <button class="window-close" @click="closeWindow">
          <img :src="closeIcon" alt="Close" width="16" height="16">
        </button>
      </div>
    </div>
    
    <!-- 历史记录面板 -->
    <div v-if="showHistory" class="history-panel">
      <div class="history-header">
        <h3>{{ t('aiAssistant.historyTitle') }}</h3>
        <button class="new-chat-btn" @click="createNewSession">
          {{ t('aiAssistant.newChat') }}
        </button>
      </div>
      
      <div class="history-list">
        <div 
          v-for="session in historySessions" 
          :key="session.id" 
          class="history-item"
          :class="{ 'active': session.id === currentSessionId }"
          @click="selectHistorySession(session.id)"
        >
          <div class="history-item-content">
            <div class="history-item-title">{{ session.title }}</div>
            <div class="history-item-preview">{{ session.preview }}</div>
            <div class="history-item-date">{{ formatDate(session.timestamp) }}</div>
          </div>
          <button class="delete-history-btn" @click="(e) => deleteHistorySession(session.id, e)" :title="t('aiAssistant.delete')">
            &times;
          </button>
        </div>
        
        <div v-if="historySessions.length === 0" class="history-empty">
          {{ t('aiAssistant.noHistory') }}
        </div>
      </div>
    </div>
    
    <!-- 消息容器，最小化时隐藏 -->
    <div class="messages-container">
      <div 
        v-for="(message, index) in messages" 
        :key="index"
        class="message-bubble"
        :class="{
          'user-message': message.type === 'user',
          'assistant-message': message.type === 'assistant'
        }"
      >
        <!-- 用户消息 -->
        <div v-if="message.type === 'user'" class="message-content">
          {{ message.content }}
        </div>
        
        <!-- AI消息，支持格式化 -->
        <div v-else class="message-content formatted-content">
          <!-- 使用v-html方式渲染格式化内容 -->
          <div v-html="formatMessage(message.content)"></div>
        </div>
        
        <div class="message-timestamp">{{ formatTimestamp(message.timestamp) }}</div>
      </div>
      
      <!-- 加载指示器 -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>
    
    <!-- 输入区域，最小化时隐藏 -->
    <div class="input-container">
      <textarea 
        v-model="userInput"
        class="message-input"
        :placeholder="t('aiAssistant.inputPlaceholder')"
        @keydown="handleKeyDown"
        :disabled="isLoading"
      ></textarea>
      <button 
        class="send-button" 
        @click="sendMessage"
        :disabled="!userInput.trim() || isLoading"
      >
        {{ t('aiAssistant.send') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.ai-floating-window {
  position: fixed;
  width: 320px;
  height: 450px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 9999;
  transition: transform 0.05s ease;
  border: 1px solid #e0e0e0;
  top: 0;
  left: 0;
  will-change: transform;
}

.ai-floating-window.dark-theme {
  background-color: #272727;
  border: 1px solid #444;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.window-header {
  padding: 12px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
  cursor: move;
  user-select: none;
  min-height: 48px;
  box-sizing: border-box;
}

.dark-theme .window-header {
  background-color: #333;
  border-bottom: 1px solid #444;
}

.window-title {
  font-weight: 500;
  font-size: 14px;
  color: #333;
}

.dark-theme .window-title {
  color: #eee;
}

.window-controls {
  display: flex;
  gap: 5px;
  align-items: center;
}

.window-btn {
  background: none;
  border: none;
  height: 24px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.window-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.dark-theme .window-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.window-btn img {
  width: 16px;
  height: 16px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.window-btn:hover img {
  opacity: 1;
}

.window-close {
  background: none;
  border: none;
  height: 24px;
  width: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.2s;
}

.window-close:hover {
  background-color: rgba(244, 67, 54, 0.1);
}

.window-close img {
  width: 16px;
  height: 16px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.window-close:hover img {
  opacity: 1;
}

.dark-theme .window-close:hover {
  background-color: rgba(244, 67, 54, 0.2);
}

/* 历史记录面板 */
.history-panel {
  position: absolute;
  top: 48px;
  left: 0;
  width: 100%;
  height: calc(100% - 48px);
  background-color: white;
  z-index: 10;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dark-theme .history-panel {
  background-color: #272727;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #e0e0e0;
}

.dark-theme .history-header {
  border-bottom: 1px solid #444;
}

.history-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.dark-theme .history-header h3 {
  color: #eee;
}

.new-chat-btn {
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 13px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.new-chat-btn:hover {
  background-color: #1976d2;
}

.dark-theme .new-chat-btn {
  background-color: #1a73e8;
}

.dark-theme .new-chat-btn:hover {
  background-color: #1565c0;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  border-radius: 6px;
  background-color: #f5f5f5;
  cursor: pointer;
  transition: all 0.2s;
}

.history-item:hover {
  background-color: #e3f2fd;
}

.history-item.active {
  background-color: #bbdefb;
  border-left: 3px solid #2196f3;
}

.dark-theme .history-item {
  background-color: #333;
}

.dark-theme .history-item:hover {
  background-color: #424242;
}

.dark-theme .history-item.active {
  background-color: #263238;
  border-left: 3px solid #1a73e8;
}

.history-item-content {
  flex: 1;
  overflow: hidden;
}

.history-item-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark-theme .history-item-title {
  color: #eee;
}

.history-item-preview {
  font-size: 12px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dark-theme .history-item-preview {
  color: #bbb;
}

.history-item-date {
  font-size: 11px;
  color: #888;
  margin-top: 4px;
}

.dark-theme .history-item-date {
  color: #999;
}

.delete-history-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  visibility: hidden;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.history-item:hover .delete-history-btn {
  visibility: visible;
}

.delete-history-btn:hover {
  background-color: rgba(244, 67, 54, 0.1);
  color: #f44336;
}

.dark-theme .delete-history-btn {
  color: #bbb;
}

.dark-theme .delete-history-btn:hover {
  background-color: rgba(244, 67, 54, 0.2);
  color: #ef5350;
}

.history-empty {
  text-align: center;
  color: #888;
  padding: 20px;
  font-style: italic;
}

.dark-theme .history-empty {
  color: #999;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
}

.messages-container::-webkit-scrollbar {
  width: 5px;
}

.messages-container::-webkit-scrollbar-track {
  background: transparent;
}

.messages-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
}

.dark-theme .messages-container::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.2);
}

.message-bubble {
  max-width: 80%;
  padding: 10px 12px;
  border-radius: 8px;
  position: relative;
  line-height: 1.4;
  font-size: 14px;
  word-break: break-word;
}

.user-message {
  background-color: #e3f2fd;
  color: #0d47a1;
  align-self: flex-end;
  border-bottom-right-radius: 2px;
}

.assistant-message {
  background-color: #f5f5f5;
  color: #333;
  align-self: flex-start;
  border-bottom-left-radius: 2px;
}

.dark-theme .user-message {
  background-color: #1565c0;
  color: #fff;
}

.dark-theme .assistant-message {
  background-color: #424242;
  color: #eee;
}

.message-timestamp {
  font-size: 10px;
  opacity: 0.7;
  margin-top: 4px;
  text-align: right;
}

.input-container {
  padding: 10px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 8px;
}

.dark-theme .input-container {
  border-top: 1px solid #444;
}

.message-input {
  flex: 1;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 14px;
  resize: none;
  height: 60px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

.message-input:focus {
  border-color: #2196f3;
}

.dark-theme .message-input {
  background-color: #333;
  border-color: #555;
  color: #eee;
}

.dark-theme .message-input:focus {
  border-color: #1a73e8;
}

.send-button {
  align-self: flex-end;
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 15px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s;
  height: 34px;
}

.send-button:hover:not(:disabled) {
  background-color: #1976d2;
}

.send-button:disabled {
  background-color: #bbdefb;
  cursor: not-allowed;
}

.dark-theme .send-button {
  background-color: #1a73e8;
}

.dark-theme .send-button:hover:not(:disabled) {
  background-color: #1565c0;
}

.dark-theme .send-button:disabled {
  background-color: #444;
  opacity: 0.6;
}

/* 加载指示器 */
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  align-self: flex-start;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #bdbdbd;
  animation: pulse 1.5s infinite ease-in-out;
}

.dark-theme .dot {
  background-color: #757575;
}

.dot:nth-child(1) {
  animation-delay: 0s;
}

.dot:nth-child(2) {
  animation-delay: 0.3s;
}

.dot:nth-child(3) {
  animation-delay: 0.6s;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(0.7);
    opacity: 0.5;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

/* 添加格式化内容样式 */
.formatted-content :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 90%;
}

.dark-theme .formatted-content :deep(code) {
  background-color: rgba(255, 255, 255, 0.1);
}

.formatted-content :deep(.code-block) {
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
}

.dark-theme .formatted-content :deep(.code-block) {
  background-color: rgba(255, 255, 255, 0.1);
}

.formatted-content :deep(pre) {
  padding: 10px;
  margin: 0;
  font-family: monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-all;
}
</style> 