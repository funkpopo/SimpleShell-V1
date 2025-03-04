declare interface API {
  // SSH相关方法
  sshConnect: (connection: any) => Promise<{ success: boolean; id?: string; error?: string }>;
  sshCreateShell: (options: { connectionId: string; cols: number; rows: number }) => Promise<{ success: boolean; shellId?: string; error?: string }>;
  sshSendInput: (options: { connectionId: string; shellId: string; data: string }) => void;
  sshResizeTerminal: (options: { connectionId: string; shellId: string; cols: number; rows: number }) => void;
  sshCloseShell: (options: { connectionId: string; shellId: string }) => void;
  onSshData: (callback: (event: { connectionId: string; shellId: string; data: string }) => void) => () => void;
  onSshClose: (callback: (event: { connectionId: string; shellId: string }) => void) => () => void;

  // 本地终端相关方法
  createLocalTerminal: (options: { cols: number; rows: number }) => Promise<{ success: boolean; id?: string; error?: string }>;
  sendTerminalInput: (options: { id: string; data: string }) => void;
  resizeTerminal: (options: { id: string; cols: number; rows: number }) => void;
  closeTerminal: (options: { id: string }) => void;
  onTerminalData: (callback: (event: { id: string; data: string }) => void) => () => void;
  
  // 文件操作相关方法
  openFileDialog: (options?: { title?: string; buttonLabel?: string; defaultPath?: string }) => Promise<{
    canceled: boolean;
    filePath?: string;
    fileContent?: string;
    error?: string;
  }>;
  
  // 通用IPC调用
  invoke: (channel: string, ...args: any[]) => Promise<any>;
}

interface Window {
  api: API;
} 