import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  loadConnections: () => ipcRenderer.invoke('load-connections'),
  saveConnections: (organizations) => {
    // 序列化数据以确保传递过程中不丢失
    let serializableData;
    try {
      // 确保数据是可序列化的，通过深拷贝处理
      serializableData = JSON.parse(JSON.stringify(organizations || []))
      console.log('preload层接收到保存请求，数据大小:', 
                 Array.isArray(serializableData) ? serializableData.length : '非数组')
    } catch (err) {
      console.error('序列化organizations失败:', err)
      // 失败时发送空数组而不是拒绝请求
      serializableData = []
      console.log('序列化失败，使用空数组')
    }
    
    return ipcRenderer.invoke('save-connections', serializableData)
      .then(result => {
        console.log('保存操作完成，结果:', result)
        return result
      })
      .catch(error => {
        console.error('保存操作发生错误:', error)
        throw error
      })
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
