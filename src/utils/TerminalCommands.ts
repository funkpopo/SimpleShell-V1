export interface CommandResult {
  code: number
  stdout: string
  stderr: string
}

export class TerminalCommands {
  static async execute(stream: any, command: string): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      let stdout = ''
      let stderr = ''
      
      const dataHandler = (data: Buffer) => {
        stdout += data.toString()
      }
      
      const errorHandler = (data: Buffer) => {
        stderr += data.toString()
      }
      
      const exitHandler = (code: number) => {
        stream.removeListener('data', dataHandler)
        stream.removeListener('error', errorHandler)
        stream.removeListener('exit', exitHandler)
        
        resolve({
          code,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        })
      }
      
      stream.on('data', dataHandler)
      stream.on('error', errorHandler)
      stream.on('exit', exitHandler)
      
      stream.write(command + '\n')
    })
  }

  static async ping(stream: any): Promise<number> {
    const startTime = Date.now()
    await this.execute(stream, 'echo ping')
    return Date.now() - startTime
  }

  static async getSystemInfo(stream: any): Promise<{
    os: string
    kernel: string
    uptime: string
    memory: string
  }> {
    const results = await Promise.all([
      this.execute(stream, 'uname -a'),
      this.execute(stream, 'uptime'),
      this.execute(stream, 'free -h')
    ])

    return {
      os: results[0].stdout,
      kernel: results[0].stdout.split(' ')[2],
      uptime: results[1].stdout,
      memory: results[2].stdout
    }
  }
} 