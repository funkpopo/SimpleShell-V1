import * as pty from 'node-pty'
import { ipcMain, BrowserWindow } from 'electron'
import * as os from 'os'

interface TerminalInfo {
  process: pty.IPty
}

class TerminalManager {
  private terminals: Map<string, TerminalInfo> = new Map()

  constructor() {
    this.setupIPC()
  }

  private setupIPC() {
    ipcMain.handle('terminal-create', (event, { id, cols, rows }) => {
      try {
        const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
        const terminal = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols: cols || 80,
          rows: rows || 24,
          cwd: os.homedir(),
          env: process.env as { [key: string]: string }
        })

        this.terminals.set(id, { process: terminal })

        terminal.onData(data => {
          const window = BrowserWindow.getAllWindows()[0]
          if (window) {
            window.webContents.send(`terminal-data-${id}`, data)
          }
        })

        return { success: true }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })

    ipcMain.on('terminal-write', (event, { id, data }) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.process.write(data)
      }
    })

    ipcMain.on('terminal-resize', (event, { id, cols, rows }) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.process.resize(cols, rows)
      }
    })

    ipcMain.on('terminal-close', (event, id) => {
      const terminal = this.terminals.get(id)
      if (terminal) {
        terminal.process.kill()
        this.terminals.delete(id)
      }
    })
  }
}

export const terminalManager = new TerminalManager() 