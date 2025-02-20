declare module 'electron-store' {
  type StoreType = {
    connections?: any[];
    records?: any[];
    settings?: any;
    sessions?: any[];
  };

  class ElectronStore<T = StoreType> {
    constructor(options?: {
      name?: string;
      defaults?: Partial<T>;
    });

    get<K extends keyof T>(key: K): T[K];
    set<K extends keyof T>(key: K, value: T[K]): void;
    clear(): void;
    delete(key: string): void;
    has(key: string): boolean;
  }

  export default ElectronStore;
} 