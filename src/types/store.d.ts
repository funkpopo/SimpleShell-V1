import { Store } from 'electron-store'

interface StoreSchema {
  ssh: {
    [key: string]: {
      id: string
      name: string
      host: string
      port: number
      username: string
      password: string
    }
  }
}

declare module 'electron-store' {
  export default class TypedStore extends Store<StoreSchema> {}
} 