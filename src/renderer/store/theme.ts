import { defineStore } from 'pinia'

interface ThemeState {
  isDark: boolean
  accentColor: string
  fontSize: number
}

export const useThemeStore = defineStore('theme', {
  state: (): ThemeState => ({
    isDark: true,
    accentColor: '#42b983',
    fontSize: 14
  }),

  actions: {
    toggleTheme() {
      this.isDark = !this.isDark
      this.updateTheme()
    },

    setAccentColor(color: string) {
      this.accentColor = color
      this.updateTheme()
    },

    setFontSize(size: number) {
      this.fontSize = size
      this.updateTheme()
    },

    private updateTheme() {
      const root = document.documentElement
      root.style.setProperty('--theme-bg', this.isDark ? '#1e1e1e' : '#ffffff')
      root.style.setProperty('--theme-color', this.isDark ? '#ffffff' : '#000000')
      root.style.setProperty('--accent-color', this.accentColor)
      root.style.setProperty('--font-size', `${this.fontSize}px`)
    }
  },

  persist: {
    enabled: true,
    strategies: [
      {
        key: 'theme',
        storage: window.localStorage
      }
    ]
  }
}) 