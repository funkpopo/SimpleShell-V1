export interface ConnectionInfo {
  name: string
  label: string
  path: string
  type: string
  host: string
  port: number
  username: string
  authType: 'password' | 'privateKey'
  password?: string
  privateKeyPath?: string
  passphrase?: string
} 