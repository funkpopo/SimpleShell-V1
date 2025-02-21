import { Client } from 'ssh2'
import { BrowserWindow, ipcMain } from 'electron'
import * as pty from 'node-pty'

interface SSHConnection {
  id: number
  client: Client
  shell: any
}

const connections = new Map<number, SSHConnection>()

export function setupSSH(mainWindow: BrowserWindow) {
  ipcMain.on('terminal:connect', async (event, { id, config }) => {
    const conn = new Client()
    
    conn.on('ready', () => {
      conn.shell((err, stream) => {
        if (err) {
          mainWindow.webContents.send(`terminal:error:${id}`, err.message)
          return
        }
        
        const shell = pty.spawn('cmd.exe', [], {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          cwd: process.env.HOME,
          env: process.env
        })
        
        stream.on('data', (data) => {
          mainWindow.webContents.send(`terminal:data:${id}`, data.toString())
        })
        
        shell.on('data', (data) => {
          stream.write(data)
        })
        
        connections.set(id, { id, client: conn, shell })
      })
    })
    
    conn.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password
    })
  })
  
  ipcMain.on('terminal:input', (event, { id, data }) => {
    const conn = connections.get(id)
    if (conn) {
      conn.shell.write(data)
    }
  })
  
  ipcMain.on('terminal:disconnect', (event, { id }) => {
    const conn = connections.get(id)
    if (conn) {
      conn.shell.kill()
      conn.client.end()
      connections.delete(id)
    }
  })
} 