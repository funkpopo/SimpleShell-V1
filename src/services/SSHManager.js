import { NodeSSH } from 'node-ssh'
import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'

class SSHManager {
  constructor() {
    this.store = new Store()
    this.connections = new Map()
    this.activeConnection = null
    this.loadSavedConnections()
  }

  // 加载保存的连接配置
  loadSavedConnections() {
    const savedConnections = this.store.get('connections') || []
    savedConnections.forEach(config => {
      this.connections.set(config.id, {
        config,
        client: null,
        status: 'disconnected'
      })
    })
  }

  // 保存连接配置
  saveConnections() {
    const configs = Array.from(this.connections.values()).map(conn => conn.config)
    this.store.set('connections', configs)
  }

  // 添加新连接
  addConnection(config) {
    const id = uuidv4()
    const connection = {
      config: { ...config, id },
      client: null,
      status: 'disconnected'
    }
    this.connections.set(id, connection)
    this.saveConnections()
    return id
  }

  // 删除连接
  removeConnection(id) {
    const connection = this.connections.get(id)
    if (connection && connection.client) {
      connection.client.dispose()
    }
    this.connections.delete(id)
    this.saveConnections()
  }

  // 连接到服务器
  async connect(id) {
    const connection = this.connections.get(id)
    if (!connection) {
      throw new Error('连接不存在')
    }

    const { config } = connection
    const ssh = new NodeSSH()

    try {
      await ssh.connect({
        host: config.host,
        username: config.username,
        port: config.port || 22,
        password: config.password,
        privateKey: config.privateKey,
        passphrase: config.passphrase
      })

      connection.client = ssh
      connection.status = 'connected'
      this.activeConnection = id
      return ssh
    } catch (error) {
      connection.status = 'error'
      throw error
    }
  }

  // 断开连接
  async disconnect(id) {
    const connection = this.connections.get(id)
    if (connection && connection.client) {
      await connection.client.dispose()
      connection.client = null
      connection.status = 'disconnected'
      if (this.activeConnection === id) {
        this.activeConnection = null
      }
    }
  }

  // 执行远程命令
  async executeCommand(id, command) {
    const connection = this.connections.get(id)
    if (!connection || !connection.client) {
      throw new Error('未连接到服务器')
    }

    try {
      const result = await connection.client.execCommand(command)
      return result
    } catch (error) {
      throw error
    }
  }

  // 上传文件
  async uploadFile(id, localPath, remotePath, options = {}) {
    const connection = this.connections.get(id)
    if (!connection || !connection.client) {
      throw new Error('未连接到服务器')
    }

    try {
      await connection.client.putFile(localPath, remotePath, options)
    } catch (error) {
      throw error
    }
  }

  // 下载文件
  async downloadFile(id, remotePath, localPath, options = {}) {
    const connection = this.connections.get(id)
    if (!connection || !connection.client) {
      throw new Error('未连接到服务器')
    }

    try {
      await connection.client.getFile(localPath, remotePath, options)
    } catch (error) {
      throw error
    }
  }

  // 获取远程文件列表
  async listFiles(id, remotePath) {
    const connection = this.connections.get(id)
    if (!connection || !connection.client) {
      throw new Error('未连接到服务器')
    }

    try {
      const sftp = await connection.client.requestSFTP()
      return new Promise((resolve, reject) => {
        sftp.readdir(remotePath, (err, list) => {
          if (err) {
            reject(err)
          } else {
            resolve(list.map(item => ({
              name: item.filename,
              size: item.attrs.size,
              modifyTime: new Date(item.attrs.mtime * 1000),
              isDirectory: item.attrs.isDirectory(),
              permissions: item.attrs.mode
            })))
          }
        })
      })
    } catch (error) {
      throw error
    }
  }

  // 创建远程目录
  async mkdir(id, remotePath) {
    const connection = this.connections.get(id)
    if (!connection || !connection.client) {
      throw new Error('未连接到服务器')
    }

    try {
      await connection.client.mkdir(remotePath)
    } catch (error) {
      throw error
    }
  }

  // 删除远程文件或目录
  async delete(id, remotePath, isDirectory = false) {
    const connection = this.connections.get(id)
    if (!connection || !connection.client) {
      throw new Error('未连接到服务器')
    }

    try {
      if (isDirectory) {
        await connection.client.execCommand('rm -rf "' + remotePath + '"')
      } else {
        await connection.client.execCommand('rm "' + remotePath + '"')
      }
    } catch (error) {
      throw error
    }
  }
}

export default new SSHManager() 