import { ipcMain, BrowserWindow, dialog } from 'electron'
import { Client } from 'ssh2'
import * as fs from 'fs'

export function setupSSHHandlers() {
  const connections = new Map<string, any>()

  ipcMain.handle('ssh-connect', async (_event, connection) => {
    try {
      const client = new Client()
      
      await new Promise((resolve, reject) => {
        client.on('ready', () => {
          client.shell({
            term: 'xterm-256color'
          }, (err, stream) => {
            if (err) {
              client.end()
              reject(err)
              return
            }

            connections.set(connection.name, { client, stream })

            stream.on('data', (data: Buffer) => {
              const window = BrowserWindow.getAllWindows()[0]
              if (window) {
                window.webContents.send(`ssh-data-${connection.name}`, data.toString())
              }
            })

            stream.on('close', () => {
              const window = BrowserWindow.getAllWindows()[0]
              if (window) {
                window.webContents.send(`ssh-closed-${connection.name}`)
              }
              client.end()
              connections.delete(connection.name)
            })

            resolve(true)
          })
        })
        .on('error', reject)

        const connectConfig: any = {
          host: connection.host,
          port: connection.port,
          username: connection.username,
          tryKeyboard: true
        }

        if (connection.authType === 'password') {
          connectConfig.password = connection.password
        } else if (connection.authType === 'privateKey') {
          try {
            const privateKey = fs.readFileSync(connection.privateKeyPath!)
            connectConfig.privateKey = privateKey
            if (connection.passphrase) {
              connectConfig.passphrase = connection.passphrase
            }
          } catch (error) {
            reject(new Error(`读取私钥文件失败: ${(error as Error).message}`))
            return
          }
        }

        client.connect(connectConfig)
      })

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })

  ipcMain.on('ssh-disconnect', (_event, name) => {
    const connection = connections.get(name)
    if (connection) {
      if (connection.stream) {
        connection.stream.end()
      }
      connection.client.end()
      connections.delete(name)
    }
  })

  ipcMain.on('ssh-write', (_event, { name, data }) => {
    const connection = connections.get(name)
    if (connection && connection.stream) {
      connection.stream.write(data)
    }
  })

  ipcMain.on('ssh-resize', (_event, { name, size }) => {
    const connection = connections.get(name)
    if (connection && connection.stream) {
      connection.stream.setWindow(size.rows, size.cols, 0, 0)
    }
  })

  ipcMain.handle('select-private-key', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Private Key', extensions: ['pem', 'ppk', 'key'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })

      if (!result.canceled && result.filePaths.length > 0) {
        return { success: true, filePath: result.filePaths[0] }
      }
      return { success: false, error: '未选择文件' }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    }
  })
} 