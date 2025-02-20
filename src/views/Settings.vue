<template>
  <div class="settings-container">
    <div class="settings-content">
      <h2>设置</h2>
      <el-form label-width="120px">
        <el-form-item label="主题">
          <el-select v-model="settings.theme">
            <el-option label="深色" value="dark" />
            <el-option label="浅色" value="light" />
          </el-select>
        </el-form-item>
        <el-form-item label="字体大小">
          <el-input-number v-model="settings.fontSize" :min="8" :max="32" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue'

export default defineComponent({
  name: 'Settings',
  setup() {
    const settings = reactive({
      theme: 'dark',
      fontSize: 14
    })

    const saveSettings = () => {
      // TODO: 实现设置保存逻辑
      console.log('保存设置:', settings)
    }

    return {
      settings,
      saveSettings
    }
  }
})
</script>

<style lang="scss" scoped>
.settings-container {
  height: 100%;
  background-color: #1e1e1e;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 40px;
  
  .settings-content {
    background-color: #2d2d2d;
    padding: 30px;
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
    
    h2 {
      margin-bottom: 30px;
      color: #fff;
    }
  }
}
</style> 