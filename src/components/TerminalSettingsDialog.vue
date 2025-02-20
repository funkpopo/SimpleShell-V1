<template>
  <a-modal
    :visible="visible"
    title="终端设置"
    @cancel="handleCancel"
    @ok="handleOk"
    :ok-loading="loading"
  >
    <a-form :model="form" layout="vertical">
      <a-form-item label="字体大小">
        <a-input-number
          v-model="form.fontSize"
          :min="8"
          :max="32"
          style="width: 120px"
        />
      </a-form-item>

      <a-form-item label="字体">
        <a-select v-model="form.fontFamily" style="width: 100%">
          <a-option value='Consolas, "Courier New", monospace'>Consolas</a-option>
          <a-option value="Monaco, monospace">Monaco</a-option>
          <a-option value="'Source Code Pro', monospace">Source Code Pro</a-option>
        </a-select>
      </a-form-item>

      <a-form-item label="主题">
        <a-radio-group v-model="form.theme.background">
          <a-radio value="#1e1e1e">深色</a-radio>
          <a-radio value="#ffffff">浅色</a-radio>
        </a-radio-group>
      </a-form-item>

      <a-form-item>
        <a-space>
          <a-checkbox v-model="form.cursorBlink">光标闪烁</a-checkbox>
        </a-space>
      </a-form-item>

      <a-form-item label="历史记录行数">
        <a-input-number
          v-model="form.scrollback"
          :min="1000"
          :max="50000"
          :step="1000"
          style="width: 120px"
        />
      </a-form-item>
    </a-form>

    <template #footer>
      <a-space>
        <a-button @click="handleReset">恢复默认</a-button>
        <a-button @click="handleCancel">取消</a-button>
        <a-button type="primary" :loading="loading" @click="handleOk">
          确定
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { Message } from '@arco-design/web-vue'
import { terminalSettingsService } from '../services/TerminalSettingsService'
import type { TerminalSettings } from '../services/TerminalSettingsService'

export default defineComponent({
  name: 'TerminalSettingsDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:visible', 'settings-changed'],
  setup(props, { emit }) {
    const loading = ref(false)
    const form = ref<TerminalSettings>({
      fontSize: 14,
      fontFamily: 'Consolas, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5'
      },
      cursorBlink: true,
      scrollback: 10000,
      defaultShell: 'powershell.exe'
    })

    const initForm = async () => {
      try {
        const settings = await terminalSettingsService.getSettings()
        if (settings) {
          form.value = settings
        }
      } catch (error) {
        console.error('Failed to load terminal settings:', error)
      }
    }

    const handleCancel = () => {
      emit('update:visible', false)
    }

    const handleOk = async () => {
      loading.value = true
      try {
        await terminalSettingsService.updateSettings(form.value!)
        emit('settings-changed', form.value)
        emit('update:visible', false)
        Message.success('设置已保存')
      } catch (err) {
        Message.error('保存设置失败')
      } finally {
        loading.value = false
      }
    }

    const handleReset = async () => {
      await terminalSettingsService.resetSettings()
      form.value = await terminalSettingsService.getSettings()
      Message.info('已恢复默认设置')
    }

    onMounted(async () => {
      await initForm()
    })

    return {
      loading,
      form,
      handleCancel,
      handleOk,
      handleReset
    }
  }
})
</script> 