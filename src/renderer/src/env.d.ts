/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface SystemInfo {
  osInfo: {
    platform: string
    release: string
    arch: string
  }
  cpuInfo: {
    usage: number
    model: string
    cores: number
  }
  memoryInfo: {
    total: number
    free: number
    used: number
    usedPercentage: number
  }
}

interface API {
  getSystemInfo(): Promise<SystemInfo>
}

interface Window {
  api: API
}
