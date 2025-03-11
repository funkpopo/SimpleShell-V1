<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watchEffect, nextTick, computed } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { ITerminalAddon } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'
import { LexerHighlightAddon } from '../utils/LexerHighlightAddon'
import { lexerService } from '../services/LexerService'

// 添加类型断言，临时解决类型问题
const api = (window as any).api;

interface Connection {
  id: string
  name: string
  host: string
  port: number
  username: string
  password?: string
  privateKey?: string
  privateKeyPath?: string
  description?: string
}

// 定义标签页类型
interface TerminalTab {
  id: string
  name: string
  isActive: boolean
  isLocalTerminal: boolean
  connection?: Connection
  terminalId?: string
  connectionId?: string
  shellId?: string
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  errorMessage?: string
  terminal?: Terminal
  fitAddon?: FitAddon
  highlightAddon?: ITerminalAddon
  terminalElement?: HTMLElement
  dataUnsubscribe?: () => void
  closeUnsubscribe?: () => void
}

// 从props接收连接信息和主题状态
const props = defineProps<{
  isDarkTheme: boolean
  isLocalMode?: boolean 
}>()

// 定义事件
const emit = defineEmits<{
  (e: 'tabs-change', hasTabs: boolean): void
  (e: 'active-connection-change', connectionId: string | null): void
}>()

// 标签页列表
const tabs = ref<TerminalTab[]>([])
// 当前活动标签页ID
const activeTabId = ref<string | null>(null)
// 标签容器引用
const tabsContainer = ref<HTMLElement | null>(null)
// 标签页容器引用
const terminalContainer = ref<HTMLElement | null>(null)
// 终端包装器引用
const terminalWrapper = ref<HTMLElement | null>(null)
// ResizeObserver
const resizeObserver = ref<ResizeObserver | null>(null)
// 是否可见
const isVisible = ref(true)
// 全局错误信息
const errorMessage = ref('')

// 拖拽相关的状态
const draggedTabId = ref<string | null>(null)
const dragOverTabId = ref<string | null>(null)

// 用于追踪最后一次创建终端的时间，避免频繁创建
const lastTerminalCreationTime = ref<number>(0);
const TERMINAL_CREATION_DEBOUNCE_MS = 300; // 防抖时间（毫秒）

// lexer规则加载状态
const isLoadingLexer = ref(false);
const lexerLoaded = ref(false);
const lexerError = ref<string | null>(null);

// 终端主题设置
const darkTheme = {
  background: '#1a1a1a',
  foreground: '#f0f0f0',
  cursor: '#fff',
  cursorAccent: '#000',
  selectionBackground: 'rgba(255, 255, 255, 0.3)',
  black: '#000000',
  red: '#ce352c',
  green: '#00B34A',
  yellow: '#f9b343',
  blue: '#1565c0',
  magenta: '#9c27b0',
  cyan: '#00bcd4',
  white: '#e7eaed'
}

const lightTheme = {
  background: '#ffffff',
  foreground: '#333333',
  cursor: '#333',
  cursorAccent: '#fff',
  selectionBackground: 'rgba(0, 120, 215, 0.3)',
  selectionForeground: '#000000',
  black: '#000000',
  red: '#e53935',
  green: '#43a047',
  yellow: '#fdd835',
  blue: '#2468bc',
  magenta: '#8e24aa',
  cyan: '#00acc1',
  white: '#bdbdbd'
}

// 根据主题选择终端主题
const currentTheme = computed(() => {
  return props.isDarkTheme ? darkTheme : lightTheme
})

// 生成唯一ID
const generateId = () => {
  return 'tab_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}

// 获取当前活动标签页
const activeTab = computed(() => {
  return tabs.value.find(tab => tab.id === activeTabId.value) || null;
})

// 添加新标签页
const addTab = (
  name: string, 
  isLocalTerminal: boolean = false, 
  connection?: Connection
): string => {
  const id = generateId();
  console.log(`创建新标签页 ${name}, ID: ${id}, 是本地终端: ${isLocalTerminal}`);
  
  const newTab: TerminalTab = {
    id,
    name,
    isActive: false,
    isLocalTerminal,
    connection,
    status: 'disconnected'
  };
  
  tabs.value.push(newTab);
  switchToTab(id);
  
  // 通知父组件标签页状态变化
  emit('tabs-change', tabs.value.length > 0);
  
  return id;
}

// 切换到指定标签页
const switchToTab = (id: string) => {
  console.log(`切换到标签页: ${id}`);
  
  // 先将所有标签页设为非活动
  tabs.value.forEach(tab => {
    if (tab.isActive) {
      tab.isActive = false;
      
      // 隐藏当前活动标签页的终端元素
      if (tab.terminalElement) {
        tab.terminalElement.style.display = 'none';
      }
    }
  });
  
  // 设置目标标签页为活动状态
  const tab = tabs.value.find(t => t.id === id);
  if (tab) {
    tab.isActive = true;
    activeTabId.value = id;
    
    // 显示目标标签页的终端元素
    if (tab.terminalElement) {
      tab.terminalElement.style.display = 'block';
    }
    
    // 在下一个tick中初始化终端（如果尚未初始化）
    nextTick(() => {
      if (tab && !tab.terminal) {
        console.log(`标签页 ${id} 没有终端实例，初始化中...`);
        initializeTerminal(tab);
      } else if (tab && tab.terminal) {
        console.log(`标签页 ${id} 已有终端实例，刷新大小`);
        // 刷新终端大小
        refreshTerminalSize(tab);
      }
    });
    
    // 通知父组件当前活动连接ID变化
    const connectionId = tab.isLocalTerminal ? null : (tab.connection?.id || null);
    console.log(`通知父组件连接ID变化: ${connectionId}`);
    emit('active-connection-change', connectionId);
  }
}

// 关闭标签页
const closeTab = (id: string) => {
  console.log('执行closeTab函数，关闭标签页ID:', id);
  
  const index = tabs.value.findIndex(tab => tab.id === id);
  if (index === -1) {
    console.error('找不到要关闭的标签页:', id);
    return;
  }
  
  const tab = tabs.value[index];
  console.log('找到标签页:', tab.name, '，索引:', index, '，状态:', tab.status);
  
  try {
    // 断开连接并清理资源
    console.log('尝试断开连接，标签页信息:', {
      isLocalTerminal: tab.isLocalTerminal,
      terminalId: tab.terminalId,
      connectionId: tab.connectionId,
      shellId: tab.shellId
    });
    
    disconnectTerminal(tab);
    console.log('断开连接完成，准备销毁终端');
    
    disposeTerminal(tab);
    console.log('销毁终端完成');
    
    // 检查是否关闭的是当前活动的SSH连接
    const wasActiveSSHConnection = tab.isActive && !tab.isLocalTerminal && tab.connection;
    let nextConnectionId: string | null = null;
    
    // 从列表中移除
    console.log('尝试从列表中移除标签页，当前标签页数量:', tabs.value.length);
    tabs.value.splice(index, 1);
    console.log('已从标签列表中移除标签页，剩余标签数:', tabs.value.length);
    
    // 如果关闭的是当前活动标签页，则切换到其他标签页
    if (activeTabId.value === id) {
      if (tabs.value.length > 0) {
        // 优先选择右侧标签页，如果没有则选择左侧
        const nextTab = tabs.value[Math.min(index, tabs.value.length - 1)];
        console.log('切换到下一个标签页:', nextTab.name);
        
        // 如果下一个标签页是SSH终端，记录其连接ID
        if (!nextTab.isLocalTerminal && nextTab.connection) {
          nextConnectionId = nextTab.connection.id;
        }
        
        switchToTab(nextTab.id);
      } else {
        // 没有标签页了，设置activeTabId为null
        console.log('没有标签页了，设置activeTabId为null');
        activeTabId.value = null;
        
        // 通知父组件当前没有活动连接
        emit('active-connection-change', null);
      }
    }
    
    // 如果关闭的是活动的SSH连接，但没有通过switchToTab方法更新（因为可能新的活动标签页是本地终端）
    if (wasActiveSSHConnection && nextConnectionId === null && tabs.value.length > 0) {
      console.log('关闭了活动的SSH连接，新的活动标签页可能是本地终端，显式通知连接ID变更为null');
      emit('active-connection-change', null);
    }
    
    // 通知父组件标签页状态变化
    console.log('发送tabs-change事件，hasTabs:', tabs.value.length > 0);
    emit('tabs-change', tabs.value.length > 0);
  } catch (error) {
    console.error('关闭标签页过程中发生错误:', error);
  }
}

// 初始化终端
const initializeTerminal = async (tab: TerminalTab) => {
  console.log(`初始化标签页 ${tab.id} 的终端实例`);
  
  // 检查如果已有终端，先清理
  if (tab.terminal) {
    console.log(`标签页 ${tab.id} 已存在终端实例，先清理`);
    disposeTerminal(tab);
  }
  
  // 尝试加载lexer规则文件
  if (!lexerLoaded.value && !isLoadingLexer.value) {
    isLoadingLexer.value = true;
    try {
      // 加载Linux lexer规则
      const lexerContent = await lexerService.loadLexerFile('linux');
      if (lexerContent) {
        lexerLoaded.value = true;
        console.log('成功加载lexer规则');
      } else {
        // 使用默认规则
        console.log('使用默认lexer规则');
        lexerService.setLexerContent('linux', lexerService.getDefaultLinuxLexer());
        lexerLoaded.value = true;
      }
    } catch (error) {
      console.error('加载lexer规则失败:', error);
      lexerError.value = '无法加载语法高亮规则';
    } finally {
      isLoadingLexer.value = false;
    }
  }
  
  // 创建一个新的终端
  tab.terminal = new Terminal({
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: 14,
    lineHeight: 1.2,
    cursorBlink: true,
    theme: currentTheme.value,
    scrollback: 5000,
    fastScrollModifier: 'alt',
    convertEol: true,
    allowTransparency: true,
    disableStdin: false,
    rightClickSelectsWord: false,
    allowProposedApi: true
  });

  // 添加插件
  tab.fitAddon = new FitAddon();
  tab.terminal.loadAddon(tab.fitAddon);
  tab.terminal.loadAddon(new WebLinksAddon());
  
  // 添加高亮插件
  if (lexerLoaded.value) {
    try {
      const lexerContent = await lexerService.loadLexerFile('linux');
      tab.highlightAddon = new LexerHighlightAddon(props.isDarkTheme, lexerContent);
      tab.terminal.loadAddon(tab.highlightAddon);
      console.log(`为终端 ${tab.id} 加载了语法高亮插件`);
    } catch (error) {
      console.error('加载语法高亮插件失败:', error);
    }
  }

  // 在DOM挂载后打开终端
  nextTick(() => {
    if (!tab.terminal || !terminalContainer.value) return;
    
    // 检查是否已有元素，有则删除
    const existingElement = terminalContainer.value.querySelector(`[data-tab-id="${tab.id}"]`);
    if (existingElement) {
      console.log(`移除标签页 ${tab.id} 已存在的DOM元素`);
      existingElement.remove();
    }
    
    // 创建终端容器
    const terminalElement = document.createElement('div');
    terminalElement.className = 'terminal-instance';
    terminalElement.dataset.tabId = tab.id;
    terminalElement.style.display = tab.isActive ? 'block' : 'none';
    terminalElement.style.width = '100%';
    terminalElement.style.height = '100%';
    
    terminalContainer.value.appendChild(terminalElement);
    tab.terminalElement = terminalElement;
    
    // 打开终端
    tab.terminal.open(terminalElement);
    console.log(`标签页 ${tab.id} 的终端DOM已创建并挂载`);
    
    // 添加右键菜单和中键粘贴事件监听
    terminalElement.addEventListener('contextmenu', (e) => handleContextMenu(e, tab.terminal!));
    terminalElement.addEventListener('mousedown', (e) => handleMiddleClick(e, tab.terminal!));
    terminalElement.addEventListener('click', hideContextMenu);
    
    // 调整终端大小
    refreshTerminalSize(tab);
    
    // 连接到终端
    if (tab.isLocalTerminal) {
      console.log(`为标签页 ${tab.id} 创建本地终端连接`);
      connectToLocalTerminal(tab);
    } else if (tab.connection) {
      console.log(`为标签页 ${tab.id} 创建SSH终端连接`);
      connectToSSH(tab);
    }
  });
}

// 刷新终端大小
const refreshTerminalSize = (tab?: TerminalTab) => {
  if (!isVisible.value) return;
  
  const targetTab = tab || activeTab.value;
  if (!targetTab || !targetTab.terminal || !targetTab.fitAddon) return;
  
  nextTick(() => {
    try {
      // 确保终端元素可见并有正确的尺寸
      if (targetTab.terminalElement && 
          targetTab.terminalElement.offsetWidth > 0 && 
          targetTab.terminalElement.offsetHeight > 0 && 
          targetTab.fitAddon) {
        
        // 调整终端大小
        targetTab.fitAddon.fit();
        
        // 获取新尺寸
        const cols = targetTab.terminal?.cols || 80;
        const rows = targetTab.terminal?.rows || 24;
        console.log(`调整标签页 ${targetTab.id} 的终端大小: ${cols}x${rows}`);
        
        // 手动调整xterm-screen的宽度为100%
        const xtermScreen = targetTab.terminalElement.querySelector('.xterm-screen') as HTMLElement;
        if (xtermScreen) {
          xtermScreen.style.width = '100%';
        }
        
        // 通知后端调整终端大小
        handleTabResize(targetTab);
      }
    } catch (err) {
      console.error(`调整终端大小错误(标签页ID: ${targetTab.id}):`, err);
    }
  });
}

// 处理终端大小调整
const handleTabResize = (tab: TerminalTab) => {
  if (!tab.terminal || !tab.fitAddon) {
    console.log(`终端或FitAddon不存在，无法调整大小，标签ID: ${tab.id}`);
    return;
  }
  
  // 获取新的尺寸
  const cols = tab.terminal.cols;
  const rows = tab.terminal.rows;
  
  // 调整终端大小
  if (tab.status === 'connected') {
    if (tab.isLocalTerminal && tab.terminalId) {
      console.log(`向本地终端[${tab.terminalId}]发送调整大小命令: ${cols}x${rows}`);
      try {
        api.resizeTerminal({
          id: tab.terminalId,
          cols,
          rows
        });
      } catch (error) {
        console.error(`调整本地终端[${tab.terminalId}]大小失败:`, error);
      }
    } else if (tab.connectionId && tab.shellId) {
      console.log(`向SSH终端[${tab.connectionId}/${tab.shellId}]发送调整大小命令: ${cols}x${rows}`);
      try {
        api.sshResizeTerminal({
          connectionId: tab.connectionId,
          shellId: tab.shellId,
          cols,
          rows
        });
      } catch (error) {
        console.error(`调整SSH终端[${tab.connectionId}/${tab.shellId}]大小失败:`, error);
      }
    }
  } else {
    console.log(`终端未连接，不发送调整大小命令，标签ID: ${tab.id}, 状态: ${tab.status}`);
  }
}

// 连接到SSH服务器
const connectToSSH = async (tab: TerminalTab) => {
  if (!tab.terminal || !tab.connection) return;
  
  try {
    tab.status = 'connecting';
    tab.errorMessage = '';
    
    // 显示连接中信息
    tab.terminal.write(`正在连接到 ${tab.connection.name} (${tab.connection.host}:${tab.connection.port})...\r\n`);
    
    // 再次进行对象清理，确保数据安全
    const connectionData = {
      id: tab.connection.id,
      name: tab.connection.name,
      host: tab.connection.host,
      port: tab.connection.port,
      username: tab.connection.username,
      password: tab.connection.password || '',
      privateKey: tab.connection.privateKey || ''
    };
    
    console.log('正在连接SSH服务器:', {
      host: connectionData.host,
      port: connectionData.port,
      username: connectionData.username,
      hasPassword: !!connectionData.password,
      hasPrivateKey: !!connectionData.privateKey
    });
    
    // 先建立SSH连接
    try {
      const connectResult = await api.sshConnect(connectionData);
      if (!connectResult.success) {
        throw new Error(connectResult.error || '连接失败');
      }
      
      tab.connectionId = connectResult.id;
      console.log('SSH连接成功, 连接ID:', tab.connectionId);
    } catch (connectError: any) {
      console.error('SSH连接阶段错误:', connectError);
      throw new Error(`连接失败: ${connectError.message || '未知错误'}`);
    }
    
    // 获取终端尺寸
    const cols = tab.terminal.cols;
    const rows = tab.terminal.rows;
    
    // 创建Shell会话
    try {
      const shellResult = await api.sshCreateShell({
        connectionId: tab.connectionId,
        cols,
        rows
      });
      
      if (!shellResult.success) {
        throw new Error(shellResult.error || '创建Shell失败');
      }
      
      tab.shellId = shellResult.shellId;
      console.log('SSH Shell创建成功, Shell ID:', tab.shellId);
    } catch (shellError: any) {
      console.error('创建Shell阶段错误:', shellError);
      throw new Error(`创建Shell失败: ${shellError.message || '未知错误'}`);
    }
    
    // 连接成功
    tab.status = 'connected';
    
    // 设置终端输入监听
    tab.terminal.onData((data) => {
      if (tab.status === 'connected' && tab.connectionId && tab.shellId) {
        api.sshSendInput({
          connectionId: tab.connectionId,
          shellId: tab.shellId,
          data
        });
      }
    });
    
    // 监听Shell数据
    const dataUnsubscribe = api.onSshData((event) => {
      if (
        event.connectionId === tab.connectionId &&
        event.shellId === tab.shellId &&
        tab.terminal
      ) {
        tab.terminal.write(event.data);
      }
    });
    
    // 监听Shell关闭
    const closeUnsubscribe = api.onSshClose((event) => {
      if (
        event.connectionId === tab.connectionId &&
        event.shellId === tab.shellId
      ) {
        // Shell被关闭
        tab.terminal?.writeln('\r\n\x1b[1;31m连接已关闭\x1b[0m');
        tab.status = 'disconnected';
        tab.shellId = undefined;
        
        // 清理事件监听
        dataUnsubscribe();
        closeUnsubscribe();
      }
    });
    
    // 保存取消订阅函数，以便在关闭标签时调用
    tab.dataUnsubscribe = dataUnsubscribe;
    tab.closeUnsubscribe = closeUnsubscribe;
  } catch (error: any) {
    console.error('SSH连接错误:', error);
    tab.status = 'error';
    tab.errorMessage = error.message || '连接失败';
    
    if (tab.terminal) {
      tab.terminal.writeln(`\r\n\x1b[1;31m错误: ${tab.errorMessage}\x1b[0m`);
      
      // 显示更详细的错误提示和可能的解决方案
      tab.terminal.writeln('\r\n\x1b[33m可能的原因:\x1b[0m');
      tab.terminal.writeln(' - 服务器地址或端口不正确');
      tab.terminal.writeln(' - 用户名或密码错误');
      tab.terminal.writeln(' - 私钥格式不正确');
      tab.terminal.writeln(' - 服务器不可达或防火墙阻止');
      tab.terminal.writeln(' - SSH服务未运行');
      tab.terminal.writeln('\r\n\x1b[33m请检查连接信息并重试\x1b[0m');
    }
  }
}

// 连接到本地终端
const connectToLocalTerminal = async (tab: TerminalTab) => {
  if (!tab.terminal) return;
  
  try {
    tab.status = 'connecting';
    tab.errorMessage = '';
    
    // 显示连接中信息
    tab.terminal.write('正在启动本地终端...\r\n');
    
    // 获取终端尺寸
    const cols = tab.terminal.cols;
    const rows = tab.terminal.rows;
    
    // 创建本地终端
    console.log(`准备创建新的本地终端会话，标签ID: ${tab.id}`);
    const result = await api.createLocalTerminal({ cols, rows });
    
    if (!result.success) {
      throw new Error(result.error || '创建终端失败');
    }
    
    tab.terminalId = result.id;
    
    // 连接成功
    tab.status = 'connected';
    console.log(`本地终端连接成功，标签ID: ${tab.id}, 终端ID: ${tab.terminalId}`);
    
    // 设置终端输入监听
    tab.terminal.onData((data) => {
      if (tab.status === 'connected' && tab.terminalId) {
        console.log(`标签页[${tab.id}]发送输入到终端[${tab.terminalId}]`);
        api.sendTerminalInput({
          id: tab.terminalId,
          data
        });
      }
    });
    
    // 监听终端数据 - 确保在创建新的监听器前取消旧的监听器
    if (tab.dataUnsubscribe) {
      console.log(`移除标签页[${tab.id}]的旧数据监听器`);
      tab.dataUnsubscribe();
    }
    
    const dataUnsubscribe = api.onTerminalData((event) => {
      // 确保只处理属于这个标签页的终端数据
      // 使用严格比较确保数据精确匹配到正确终端
      if (event.id === tab.terminalId && tab.terminal) {
        try {
          // 调试输出数据接收情况
          if (tab.status === 'connected' && process.env.NODE_ENV === 'development') {
            const shortData = event.data.length > 20 ? event.data.substring(0, 20) + '...' : event.data;
            console.log(`标签页[${tab.id}]接收到终端[${event.id}]数据: ${shortData.replace(/\n/g, '\\n')}`);
          }
          tab.terminal.write(event.data);
        } catch (err) {
          console.error(`写入终端数据错误 (标签ID: ${tab.id}, 终端ID: ${tab.terminalId}):`, err);
        }
      } else if (event.id !== tab.terminalId && event.data && event.data.length > 0 && process.env.NODE_ENV === 'development') {
        // 调试日志：记录错误的数据流向，帮助排查问题
        console.log(`标签页[${tab.id}]收到了不属于自己的终端[${event.id}]数据，但未处理`);
      }
    });
    
    // 保存取消订阅函数，以便在关闭标签时调用
    tab.dataUnsubscribe = dataUnsubscribe;
    
    // 保存到终端标签页
    tab.isLocalTerminal = true;
    
  } catch (error: any) {
    console.error('本地终端错误:', error);
    tab.status = 'error';
    tab.errorMessage = error.message || '启动终端失败';
    
    if (tab.terminal) {
      tab.terminal.writeln(`\r\n\x1b[1;31m错误: ${tab.errorMessage}\x1b[0m`);
    }
  }
}

// 断开终端连接
const disconnectTerminal = (tab: TerminalTab) => {
  console.log(`执行disconnectTerminal函数，标签ID: ${tab.id}, 终端ID: ${tab.terminalId}`);
  
  // 断开SSH连接
  if (tab.connectionId && tab.shellId) {
    console.log('断开SSH连接, connectionId:', tab.connectionId, 'shellId:', tab.shellId);
    try {
      api.sshCloseShell({
        connectionId: tab.connectionId,
        shellId: tab.shellId
      });
      console.log('SSH连接断开成功');
    } catch (error) {
      console.error('SSH连接断开失败:', error);
    }
    
    tab.shellId = undefined;
  }
  
  // 或者关闭本地终端
  if (tab.isLocalTerminal && tab.terminalId) {
    console.log(`关闭本地终端, 标签ID: ${tab.id}, 终端ID: ${tab.terminalId}`);
    try {
      api.closeTerminal({ id: tab.terminalId });
      console.log(`本地终端[${tab.terminalId}]关闭成功`);
    } catch (error) {
      console.error(`本地终端[${tab.terminalId}]关闭失败:`, error);
    }
    
    // 标记终端ID为undefined，防止误用
    const oldTerminalId = tab.terminalId;
    tab.terminalId = undefined;
    console.log(`标签页[${tab.id}]的终端ID已重置(旧ID: ${oldTerminalId})`);
  }
  
  // 取消数据订阅
  if (tab.dataUnsubscribe) {
    console.log(`取消终端数据订阅，标签ID: ${tab.id}`);
    tab.dataUnsubscribe();
    tab.dataUnsubscribe = undefined;
  }
  
  // 取消关闭事件订阅（SSH专用）
  if (tab.closeUnsubscribe) {
    console.log('取消SSH关闭事件订阅');
    tab.closeUnsubscribe();
    tab.closeUnsubscribe = undefined;
  }
  
  console.log(`将标签页[${tab.id}]状态设置为disconnected`);
  tab.status = 'disconnected';
}

// 销毁终端
const disposeTerminal = (tab: TerminalTab) => {
  console.log(`执行disposeTerminal函数，标签ID: ${tab.id}`);
  
  if (tab.terminal) {
    console.log(`销毁终端实例，标签ID: ${tab.id}`);
    try {
      // 先取消输入监听，防止在dispose过程中触发
      tab.terminal.onData(() => {});
      
      // 清理插件
      if (tab.highlightAddon) {
        console.log(`清理高亮插件，标签ID: ${tab.id}`);
        try {
          tab.highlightAddon.dispose();
          tab.highlightAddon = undefined;
        } catch (error) {
          console.error(`高亮插件清理失败，标签ID: ${tab.id}，错误:`, error);
        }
      }
      
      // 安全销毁终端
      tab.terminal.dispose();
      console.log(`终端实例销毁成功，标签ID: ${tab.id}`);
    } catch (error) {
      console.error(`终端实例销毁失败，标签ID: ${tab.id}，错误:`, error);
    }
    
    tab.terminal = undefined;
    tab.fitAddon = undefined;
    
    // 移除DOM元素
    if (tab.terminalElement && tab.terminalElement.parentElement) {
      console.log(`移除终端DOM元素，标签ID: ${tab.id}`);
      try {
        tab.terminalElement.parentElement.removeChild(tab.terminalElement);
        console.log(`终端DOM元素移除成功，标签ID: ${tab.id}`);
      } catch (error) {
        console.error(`终端DOM元素移除失败，标签ID: ${tab.id}，错误:`, error);
      }
    }
    tab.terminalElement = undefined;
  } else {
    console.log(`终端实例不存在，无需销毁，标签ID: ${tab.id}`);
  }
}

// 设置ResizeObserver来监控终端容器大小变化
const setupResizeObserver = () => {
  // 先清理之前的observer
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }
  
  // 创建新的ResizeObserver
  resizeObserver.value = new ResizeObserver(() => {
    if (isVisible.value && activeTab.value) {
      refreshTerminalSize(activeTab.value);
    }
  });
  
  // 开始监控终端容器
  if (terminalWrapper.value) {
    resizeObserver.value.observe(terminalWrapper.value);
  }
}

// 添加本地终端标签页
const addLocalTerminal = () => {
  // 添加防抖逻辑，避免短时间内多次创建终端
  const now = Date.now();
  if (now - lastTerminalCreationTime.value < TERMINAL_CREATION_DEBOUNCE_MS) {
    console.log(`终端创建请求过于频繁，已忽略 (${now - lastTerminalCreationTime.value}ms)`);
    return '';
  }
  
  lastTerminalCreationTime.value = now;
  console.log('添加本地终端标签页，当前标签数:', tabs.value.length);
  
  // 生成唯一的标签名，避免重复
  const terminalCount = tabs.value.filter(tab => tab.isLocalTerminal).length + 1;
  const tabName = terminalCount > 1 ? `本地终端 (${terminalCount})` : '本地终端';
  
  const tabId = addTab(tabName, true);
  console.log(`本地终端标签页已添加，ID: ${tabId}, 名称: ${tabName}`);
  
  // 确保nextTick后终端被正确初始化
  nextTick(() => {
    const tab = tabs.value.find(t => t.id === tabId);
    if (tab && !tab.terminal) {
      console.log(`确认初始化终端 ${tabId}`);
      initializeTerminal(tab);
    }
  });
  
  return tabId;
}

// 添加SSH连接标签页
const addSshConnection = (connection: Connection) => {
  try {
    // 使用JSON序列化再反序列化方式完全清理对象，消除所有可能的非序列化内容
    const connectionStr = JSON.stringify({
      id: connection.id || `conn_${Date.now()}`,
      name: connection.name || '未命名连接',
      host: connection.host || '',
      port: connection.port || 22,
      username: connection.username || '',
      password: connection.password || '',
      privateKey: connection.privateKey || '',
      privateKeyPath: connection.privateKeyPath || '',
      description: connection.description || ''
    });
    console.log('连接对象序列化预处理完成');
    
    // 使用完全序列化的对象创建标签页
    const cleanConnection: Connection = JSON.parse(connectionStr);
    console.log('创建干净的连接对象:', {
      name: cleanConnection.name,
      host: cleanConnection.host,
      port: cleanConnection.port,
      username: cleanConnection.username,
      hasPassword: !!cleanConnection.password,
      hasPrivateKey: !!cleanConnection.privateKey
    });
    
    // 使用清理后的连接对象添加标签页
    const newTabId = addTab(`${cleanConnection.name} (${cleanConnection.host})`, false, cleanConnection);
    
    // 清除可能存在的错误消息
    errorMessage.value = '';
    
    // 通知父组件当前活动连接ID变化
    console.log(`SSH连接已创建，通知父组件更新连接ID: ${cleanConnection.id}`);
    emit('active-connection-change', cleanConnection.id);
    
    return newTabId;
  } catch (error: any) {
    console.error('添加SSH连接时出错:', error);
    // 设置全局错误消息
    errorMessage.value = `无法建立SSH连接: ${error.message || '未知错误'}`;
    return null;
  }
}

// 是否有任何标签页
const hasAnyTabs = computed(() => {
  return tabs.value.length > 0;
});

// 暴露公共方法
defineExpose({
  addLocalTerminal,
  addSshConnection,
  hasAnyTabs
});

// 组件挂载时初始化
onMounted(() => {
  isVisible.value = true;
  setupResizeObserver();
  
  // 检查是否需要自动创建终端会话
  if (props.isLocalMode && tabs.value.length === 0) {
    // 首先检查是否已经有延迟创建的请求
    // 添加一个防抖处理，避免App.vue中的setTimeout导致的重复创建
    const isCreatingFromParent = window.localStorage.getItem('terminal_creating');
    
    if (isCreatingFromParent !== 'true') {
      console.log('本地终端模式初始化：创建新终端');
      // 如果不是从父组件创建的，则在这里创建
      addLocalTerminal();
    } else {
      console.log('检测到父组件正在创建终端，跳过自动创建');
      // 清除标记
      window.localStorage.removeItem('terminal_creating');
    }
  }
  
  // 处理窗口大小变化
  window.addEventListener('resize', handleWindowResize);
});

// 处理窗口大小变化
const handleWindowResize = () => {
  const currentTab = activeTab.value;
  if (currentTab) {
    refreshTerminalSize(currentTab);
  }
};

// 监听可见性变化 (从v-show导致的父元素显示/隐藏)
onMounted(() => {
  // 创建一个MutationObserver实例，用于观察DOM变化
  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        const el = mutation.target as HTMLElement;
        // 检查元素是否可见 (通过检查display属性)
        const isCurrentlyVisible = el.style.display !== 'none';
        
        // 如果可见性状态变化了
        if (isVisible.value !== isCurrentlyVisible) {
          isVisible.value = isCurrentlyVisible;
          
          // 如果变为可见，并且已经有活动标签页
          if (isVisible.value && activeTab.value) {
            console.log('Terminal became visible, refreshing size');
            // 延迟一小段时间后刷新终端大小，确保DOM完全渲染
            setTimeout(() => {
              if (activeTab.value) {
                refreshTerminalSize(activeTab.value);
              }
            }, 50);
          }
        }
      }
    }
  });
  
  // 开始观察终端容器的父元素
  if (terminalWrapper.value && terminalWrapper.value.parentElement) {
    mutationObserver.observe(terminalWrapper.value.parentElement, {
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  // 在组件销毁时断开观察
  onBeforeUnmount(() => {
    mutationObserver.disconnect();
  });
});

// 组件销毁前清理资源
onBeforeUnmount(() => {
  // 清理所有标签页
  tabs.value.forEach(tab => {
    disconnectTerminal(tab);
    disposeTerminal(tab);
  });
  
  // 清理ResizeObserver
  if (resizeObserver.value) {
    resizeObserver.value.disconnect();
    resizeObserver.value = null;
  }
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleWindowResize);
});

// 监听主题变化
watchEffect(() => {
  if (activeTab.value?.terminal) {
    activeTab.value.terminal.options.theme = currentTheme.value;
    
    // 更新高亮插件的主题
    if (activeTab.value.highlightAddon) {
      const typedAddon = activeTab.value.highlightAddon as LexerHighlightAddon;
      if (typeof typedAddon.setTheme === 'function') {
        typedAddon.setTheme(props.isDarkTheme);
      }
    }
  }
});

// 处理关闭标签页的点击事件
const handleCloseTab = (id: string, event: Event) => {
  console.log('handleCloseTab被触发, id:', id);
  
  // 阻止事件冒泡和默认行为
  event.stopPropagation();
  event.preventDefault();
  
  try {
    console.log('准备调用closeTab方法关闭标签页:', id);
    // 调用关闭标签页的方法
    closeTab(id);
    console.log('closeTab方法调用完成');
  } catch (error) {
    console.error('handleCloseTab错误:', error);
  }
};

// 关闭错误提示
const dismissError = () => {
  errorMessage.value = '';
}

// 处理拖拽开始
const handleDragStart = (tabId: string, event: DragEvent) => {
  if (!event.dataTransfer) return
  draggedTabId.value = tabId
  event.dataTransfer.effectAllowed = 'move'
  // 设置拖拽图像为半透明
  const draggedTab = event.target as HTMLElement
  if (draggedTab) {
    event.dataTransfer.setDragImage(draggedTab, 0, 0)
    draggedTab.style.opacity = '0.5'
  }
}

// 处理拖拽结束
const handleDragEnd = (event: DragEvent) => {
  const draggedTab = event.target as HTMLElement
  if (draggedTab) {
    draggedTab.style.opacity = '1'
  }
  draggedTabId.value = null
  dragOverTabId.value = null
}

// 处理拖拽悬停
const handleDragOver = (tabId: string, event: DragEvent) => {
  event.preventDefault()
  if (draggedTabId.value === tabId) return
  dragOverTabId.value = tabId
}

// 处理拖拽离开
const handleDragLeave = () => {
  dragOverTabId.value = null
}

// 处理拖拽放置
const handleDrop = (targetTabId: string, event: DragEvent) => {
  event.preventDefault()
  if (!draggedTabId.value || draggedTabId.value === targetTabId) return

  const draggedIndex = tabs.value.findIndex(tab => tab.id === draggedTabId.value)
  const targetIndex = tabs.value.findIndex(tab => tab.id === targetTabId)
  
  if (draggedIndex !== -1 && targetIndex !== -1) {
    // 重新排序标签页
    const [draggedTab] = tabs.value.splice(draggedIndex, 1)
    tabs.value.splice(targetIndex, 0, draggedTab)
  }

  draggedTabId.value = null
  dragOverTabId.value = null
}

// 右键菜单相关状态
const contextMenu = ref<{
  visible: boolean;
  x: number;
  y: number;
  selectedText: string;
}>({
  visible: false,
  x: 0,
  y: 0,
  selectedText: ''
});

// 处理右键菜单
const handleContextMenu = (event: MouseEvent, terminal: Terminal) => {
  event.preventDefault();
  
  // 获取选中的文本
  const selection = terminal.getSelection();
  
  // 如果有选中文本，显示右键菜单
  if (selection) {
    contextMenu.value = {
      visible: true,
      x: event.clientX,
      y: event.clientY,
      selectedText: selection
    };
  }
};

// 复制选中的文本
const copySelectedText = async () => {
  if (contextMenu.value.selectedText) {
    try {
      await navigator.clipboard.writeText(contextMenu.value.selectedText);
      // 复制后隐藏菜单
      contextMenu.value.visible = false;
    } catch (err) {
      console.error('复制失败:', err);
    }
  }
};

// 处理中键粘贴
const handleMiddleClick = async (event: MouseEvent, terminal: Terminal) => {
  if (event.button === 1) { // 中键点击
    event.preventDefault();
    try {
      const text = await navigator.clipboard.readText();
      if (text && terminal) {
        // 发送粘贴的文本到终端
        terminal.paste(text);
      }
    } catch (err) {
      console.error('粘贴失败:', err);
    }
  }
};

// 隐藏右键菜单
const hideContextMenu = () => {
  contextMenu.value.visible = false;
};
</script>

<template>
  <div class="terminal-tabs-container">
    <!-- 全局错误提示 -->
    <div v-if="errorMessage" class="global-error-alert">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-text">{{ errorMessage }}</span>
        <button class="close-error" @click="dismissError">×</button>
      </div>
    </div>
    
    <!-- 标签页导航 -->
    <div ref="tabsContainer" class="tabs-navigation">
      <div 
        v-for="tab in tabs" 
        :key="tab.id" 
        class="tab"
        :class="{ 
          'active': tab.isActive, 
          [tab.status]: true,
          'dragging': draggedTabId === tab.id,
          'drag-over': dragOverTabId === tab.id
        }"
        draggable="true"
        @dragstart="handleDragStart(tab.id, $event)"
        @dragend="handleDragEnd($event)"
        @dragover="handleDragOver(tab.id, $event)"
        @dragleave="handleDragLeave"
        @drop="handleDrop(tab.id, $event)"
        @click="switchToTab(tab.id)"
      >
        <span class="tab-name">{{ tab.name }}</span>
        <span class="tab-status">
          {{ 
            tab.status === 'disconnected' ? '未连接' : 
            tab.status === 'connecting' ? '连接中...' : 
            tab.status === 'connected' ? '已连接' : 
            '连接错误'
          }}
        </span>
        <button 
          class="tab-close" 
          @click.stop.prevent="handleCloseTab(tab.id, $event)"
          type="button"
          title="关闭标签页"
        >&times;</button>
      </div>
      
      <!-- 添加新终端按钮 -->
      <button class="add-tab-button" @click="addLocalTerminal">
        <span>+</span>
      </button>
    </div>
    
    <!-- 终端内容区域 -->
    <div ref="terminalWrapper" class="terminal-wrapper">
      <div ref="terminalContainer" class="terminal-container"></div>
      
      <!-- 右键菜单 -->
      <div v-if="contextMenu.visible" 
           class="context-menu"
           :style="{ 
             left: `${contextMenu.x}px`, 
             top: `${contextMenu.y}px` 
           }"
           @click.stop>
        <div class="menu-item" @click="copySelectedText">
          <span class="menu-icon">📋</span>
          复制
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.terminal-tabs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--terminal-bg);
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

/* 全局错误提示样式 */
.global-error-alert {
  width: 100%;
  background-color: #ff6b6b;
  color: white;
  padding: 10px 16px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  position: relative;
  z-index: 5;
  animation: slideIn 0.3s ease-out;
}

.dark-theme .global-error-alert {
  background-color: #c62828;
}

.error-content {
  display: flex;
  align-items: center;
}

.error-icon {
  margin-right: 10px;
  font-size: 18px;
}

.error-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.4;
}

.close-error {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
  margin-left: 10px;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.close-error:hover {
  opacity: 1;
}

@keyframes slideIn {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}

.tabs-navigation {
  display: flex;
  overflow-x: auto;
  background-color: var(--header-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 0 4px;
  user-select: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}

.tabs-navigation::-webkit-scrollbar {
  height: 4px;
}

.tabs-navigation::-webkit-scrollbar-track {
  background: transparent;
}

.tabs-navigation::-webkit-scrollbar-thumb {
  background-color: rgba(128, 128, 128, 0.4);
  border-radius: 2px;
}

.tab {
  display: flex;
  align-items: center;
  padding: 6px 10px;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px 4px 0 0;
  margin: 4px 2px 0 2px;
  cursor: pointer;
  white-space: nowrap;
  max-width: 200px;
  position: relative;
  border: 1px solid transparent;
  border-bottom: none;
  transition: background-color 0.2s, transform 0.2s;
  user-select: none;
}

.tab.active {
  background-color: var(--terminal-bg);
  border-color: var(--border-color);
  border-bottom-color: var(--terminal-bg);
  z-index: 1;
}

.tab:hover:not(.active) {
  background-color: rgba(0, 0, 0, 0.15);
}

.tab-name {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 8px;
  color: var(--text-primary);
}

.tab-status {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 8px;
  margin-right: 6px;
  background-color: #9e9e9e;
  color: white;
}

.tab.connected .tab-status {
  background-color: #4caf50;
}

.tab.connecting .tab-status {
  background-color: #ffa726;
}

.tab.error .tab-status {
  background-color: #f44336;
}

.tab-close {
  background: none;
  border: none;
  color: var(--text-primary);
  opacity: 0.6;
  font-size: 16px;
  line-height: 1;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
  margin-left: 5px;
  position: relative;
  z-index: 10;
}

.tab-close:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.2);
}

.dark-theme .tab-close:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.add-tab-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--text-primary);
  opacity: 0.7;
  font-size: 20px;
  cursor: pointer;
  padding: 0 8px;
  margin: 4px 0 0 2px;
  height: 28px;
  transition: all 0.2s;
}

.add-tab-button:hover {
  opacity: 1;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.terminal-wrapper {
  flex: 1;
  overflow: hidden;
  position: relative;
  padding: 4px;
  width: 100%;
  height: 100%;
}

.terminal-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* 主题变量 */
:root {
  --terminal-bg: #ffffff;
  --header-bg: #f5f5f5;
  --border-color: #e0e0e0;
  --text-primary: #333333;
  --primary-color: #1976d2;
  --hover-bg: #f5f8ff;
}

:root .dark-theme {
  --terminal-bg: #1a1a1a;
  --header-bg: #272727;
  --border-color: #444444;
  --text-primary: #e0e0e0;
  --primary-color: #2196f3;
  --hover-bg: #3d3d3d;
}

/* 修改深度选择器，确保正确渲染xterm终端 */
:deep(.terminal-instance) {
  width: 100%;
  height: 100%;
}

:deep(.xterm) {
  padding: 0;
  width: 100%;
  height: 100%;
}

:deep(.xterm-screen) {
  width: 100% !important; /* 强制宽度100% */
}

:deep(.xterm-viewport) {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.4) transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar) {
  width: 6px;
}

:deep(.xterm-viewport::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb) {
  background-color: rgba(128, 128, 128, 0.4);
  border-radius: 3px;
}

:deep(.xterm-viewport::-webkit-scrollbar-thumb:hover) {
  background-color: rgba(128, 128, 128, 0.7);
}

/* 拖拽相关样式 */
.tab.dragging {
  opacity: 0.5;
  cursor: move;
}

.tab.drag-over {
  border-left: 2px solid var(--primary-color, #1976d2);
  transform: translateX(2px);
}

.dark-theme .tab.drag-over {
  border-left-color: var(--primary-color-dark, #2196f3);
}

/* 右键菜单样式优化 */
.context-menu {
  position: fixed;
  background: var(--terminal-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 6px 0;
  min-width: 160px;
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15),
              0 0 2px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  font-size: 13px;
  backdrop-filter: blur(8px);
  transform-origin: top left;
  animation: menuAppear 0.15s ease-out;
}

@keyframes menuAppear {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-item {
  padding: 8px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--text-primary);
  transition: all 0.2s ease;
  margin: 0 4px;
  border-radius: 4px;
}

.menu-item:hover {
  background-color: var(--header-bg);
  color: #1976d2;
}

.menu-icon {
  margin-right: 10px;
  font-size: 14px;
  opacity: 0.8;
}

/* 日间主题特定样式 */
:root:not(.dark-theme) .context-menu {
  background: rgba(255, 255, 255, 0.98);
  border-color: #e0e0e0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1),
              0 2px 4px rgba(0, 0, 0, 0.05);
}

:root:not(.dark-theme) .menu-item {
  color: #cccccc;
}

:root:not(.dark-theme) .menu-item:hover {
  background-color: #f5f8ff;
  color: #1565c0;
}

/* 深色主题特定样式保持不变 */
:root .dark-theme .context-menu {
  background: rgba(45, 45, 45, 0.98);
  border-color: #444;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4),
              0 2px 4px rgba(0, 0, 0, 0.2);
}

:root .dark-theme .menu-item:hover {
  background-color: #3d3d3d;
  color: #64b5f6;
}
</style> 