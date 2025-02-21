<template>
  <el-drawer
    v-model="visible"
    title="主题设置"
    direction="rtl"
    size="300px">
    <div class="theme-settings">
      <el-form label-position="top">
        <el-form-item label="主题模式">
          <el-switch
            v-model="isDark"
            active-text="深色"
            inactive-text="浅色"
            @change="toggleTheme"
          />
        </el-form-item>

        <el-form-item label="主题色">
          <el-color-picker
            v-model="accentColor"
            show-alpha
            @change="setAccentColor"
          />
        </el-form-item>

        <el-form-item label="字体大小">
          <el-slider
            v-model="fontSize"
            :min="12"
            :max="20"
            :step="1"
            show-input
            @change="setFontSize"
          />
        </el-form-item>
      </el-form>
    </div>
  </el-drawer>
</template>

<script lang="ts">
import { defineComponent, ref } from '@vue/runtime-core'
import { useThemeStore } from '../store/theme'

export default defineComponent({
  name: 'ThemeSettings',
  setup() {
    const themeStore = useThemeStore()
    const visible = ref(false)

    const isDark = ref(themeStore.isDark)
    const accentColor = ref(themeStore.accentColor)
    const fontSize = ref(themeStore.fontSize)

    const toggleTheme = () => {
      themeStore.toggleTheme()
      isDark.value = themeStore.isDark
    }

    const setAccentColor = (color: string) => {
      themeStore.setAccentColor(color)
      accentColor.value = color
    }

    const setFontSize = (size: number) => {
      themeStore.setFontSize(size)
      fontSize.value = size
    }

    return {
      visible,
      isDark,
      accentColor,
      fontSize,
      toggleTheme,
      setAccentColor,
      setFontSize
    }
  }
})
</script>

<style scoped>
.theme-settings {
  padding: 20px;
}
</style> 