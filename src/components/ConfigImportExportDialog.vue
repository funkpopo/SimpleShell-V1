<template>
  <a-modal
    :visible="visible"
    :title="isExport ? '导出配置' : '导入配置'"
    @cancel="handleCancel"
    @ok="handleOk"
    :ok-loading="loading"
  >
    <template v-if="isExport">
      <a-alert type="info" content="导出的配置文件包含敏感信息,请妥善保管" />
      <div class="mt-4">
        <a-radio-group v-model="exportType">
          <a-radio value="file">导出到文件</a-radio>
          <a-radio value="clipboard">复制到剪贴板</a-radio>
        </a-radio-group>
      </div>
    </template>
    <template v-else>
      <a-alert type="warning" content="导入将覆盖现有配置,请谨慎操作" />
      <div class="mt-4">
        <a-radio-group v-model="importType">
          <a-radio value="file">从文件导入</a-radio>
          <a-radio value="clipboard">从剪贴板导入</a-radio>
        </a-radio-group>
      </div>
      <a-textarea
        v-if="importType === 'clipboard'"
        v-model="importContent"
        :auto-size="{ minRows: 4, maxRows: 10 }"
        placeholder="请粘贴配置内容"
        class="mt-2"
      />
    </template>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { Message } from '@arco-design/web-vue'
import { configService } from '@/services/ConfigService'

export default defineComponent({
  name: 'ConfigImportExportDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    isExport: {
      type: Boolean,
      required: true
    }
  },
  emits: ['update:visible', 'success'],
  setup(props, { emit }) {
    const loading = ref(false)
    const exportType = ref('file')
    const importType = ref('file')
    const importContent = ref('')

    const handleCancel = () => {
      emit('update:visible', false)
    }

    const handleOk = async () => {
      loading.value = true
      try {
        if (props.isExport) {
          if (exportType.value === 'file') {
            const { dialog } = window.require('electron').remote
            const { filePath } = await dialog.showSaveDialog({
              filters: [{ name: 'JSON', extensions: ['json'] }]
            })
            if (filePath) {
              await configService.exportToFile(filePath)
              Message.success('导出成功')
            }
          } else {
            const data = configService.exportConfigs()
            await navigator.clipboard.writeText(data)
            Message.success('已复制到剪贴板')
          }
        } else {
          if (importType.value === 'file') {
            const { dialog } = window.require('electron').remote
            const { filePaths } = await dialog.showOpenDialog({
              filters: [{ name: 'JSON', extensions: ['json'] }]
            })
            if (filePaths?.[0]) {
              await configService.importFromFile(filePaths[0])
              Message.success('导入成功')
              emit('success')
            }
          } else {
            configService.importConfigs(importContent.value)
            Message.success('导入成功')
            emit('success')
          }
        }
        emit('update:visible', false)
      } catch (err) {
        Message.error(err.message)
      } finally {
        loading.value = false
      }
    }

    return {
      loading,
      exportType,
      importType,
      importContent,
      handleCancel,
      handleOk
    }
  }
})
</script>

<style scoped>
.mt-2 {
  margin-top: 8px;
}
.mt-4 {
  margin-top: 16px;
}
</style> 