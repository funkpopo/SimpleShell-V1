import { globalShortcut, BrowserWindow } from 'electron'

export function setupShortcuts(mainWindow: BrowserWindow) {
  // 新建标签页
  globalShortcut.register('CommandOrControl+T', () => {
    mainWindow.webContents.send('shortcut:new-tab')
  })

  // 关闭标签页
  globalShortcut.register('CommandOrControl+W', () => {
    mainWindow.webContents.send('shortcut:close-tab')
  })

  // 切换标签页
  globalShortcut.register('CommandOrControl+Tab', () => {
    mainWindow.webContents.send('shortcut:next-tab')
  })
  
  globalShortcut.register('CommandOrControl+Shift+Tab', () => {
    mainWindow.webContents.send('shortcut:prev-tab')
  })

  // 连接管理器
  globalShortcut.register('CommandOrControl+K', () => {
    mainWindow.webContents.send('shortcut:connection-manager')
  })
}

// 清理快捷键
export function clearShortcuts() {
  globalShortcut.unregisterAll()
} 