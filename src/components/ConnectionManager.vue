<template>
  <div class="connection-manager">
    <a-menu
      :style="{ width: '100%' }"
      @menuItemClick="handleMenuClick"
    >
      <a-menu-item key="add">
        <template #icon><icon-plus /></template>
        添加连接
      </a-menu-item>
      <a-menu-item 
        v-for="conn in connections" 
        :key="conn.id"
        @contextmenu.prevent="showContextMenu($event, conn)"
      >
        <template #icon><icon-robot /></template>
        {{ conn.name }}
      </a-menu-item>
      <a-sub-menu key="settings">
        <template #icon><icon-settings /></template>
        <template #title>设置</template>
        <a-menu-item key="history" @click="showHistory">连接记录</a-menu-item>
        <a-menu-item key="import" @click="showImport">导入配置</a-menu-item>
        <a-menu-item key="export" @click="showExport">导出配置</a-menu-item>
        <a-menu-item key="terminal" @click="showTerminalSettings">终端设置</a-menu-item>
      </a-sub-menu>
    </a-menu>

    <ConnectionDialog
      v-model:visible="dialogVisible"
      :config="currentConfig"
      @save="handleSave"
    />

    <ConfigImportExportDialog
      v-model:visible="importExportVisible"
      :is-export="isExport"
      @success="loadConnections"
    />

    <TerminalSettingsDialog
      v-model:visible="terminalSettingsVisible"
      @settings-changed="handleTerminalSettingsChanged"
    />

    <ConnectionHistoryDialog v-model:visible="historyVisible" />

    <a-dropdown :popup-visible="contextMenuVisible" @select="handleContextMenuSelect">
      <div style="display: none" />
      <template #content>
        <a-doption value="edit">编辑</a-doption>
        <a-doption value="delete">删除</a-doption>
      </template>
    </a-dropdown>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { Message, Modal } from '@arco-design/web-vue'
import { IconPlus, IconRobot, IconSettings } from '@arco-design/web-vue/es/icon'
import ConnectionDialog from './ConnectionDialog.vue'
import { configService, SSHConfig } from '@/services/ConfigService'
import ConfigImportExportDialog from './ConfigImportExportDialog.vue'
import TerminalSettingsDialog from './TerminalSettingsDialog.vue'
import ConnectionHistoryDialog from './ConnectionHistoryDialog.vue'
import { eventBus } from '@/services/EventBusService'
import { connectionHistoryService } from '@/services/ConnectionHistoryService'

export default defineComponent({
  name: 'ConnectionManager',
  components: {
    IconPlus,
    IconRobot,
    IconSettings,
    ConnectionDialog,
    ConfigImportExportDialog,
    TerminalSettingsDialog,
    ConnectionHistoryDialog
  },
  emits: ['select-connection'],
  setup(props, { emit }) {
    const connections = ref<SSHConfig[]>([])
    const dialogVisible = ref(false)
    const currentConfig = ref<SSHConfig | null>(null)
    const contextMenuVisible = ref(false)
    const contextMenuCoord = ref({ x: 0, y: 0 })
    const importExportVisible = ref(false)
    const isExport = ref(false)
    const terminalSettingsVisible = ref(false)
    const historyVisible = ref(false)
    
    const loadConnections = async () => {
      connections.value = await configService.getAllConnections()
    }

    const handleMenuClick = (key: string) => {
      if (key === 'add') {
        currentConfig.value = null
        dialogVisible.value = true
      } else {
        const conn = connections.value.find(c => c.id === key)
        if (conn) {
          emit('select-connection', conn)
        }
      }
    }

    const handleSave = async (config: SSHConfig) => {
      if (currentConfig.value) {
        await configService.updateConnection({
          ...config,
          id: currentConfig.value.id
        })
      } else {
        await configService.addConnection(config)
      }
      await loadConnections()
    }

    const showContextMenu = (e: MouseEvent, config: SSHConfig) => {
      e.preventDefault()
      currentConfig.value = config
      contextMenuCoord.value = { x: e.clientX, y: e.clientY }
      contextMenuVisible.value = true
    }

    const handleContextMenuSelect = async (key: string) => {
      contextMenuVisible.value = false
      
      if (key === 'edit') {
        dialogVisible.value = true
      } else if (key === 'delete') {
        Modal.confirm({
          title: '确认删除',
          content: '确定要删除该连接吗？',
          async onOk() {
            if (currentConfig.value) {
              await configService.deleteConnection(currentConfig.value.id)
              await loadConnections()
              Message.success('删除成功')
            }
          }
        })
      }
    }

    const showImport = () => {
      isExport.value = false
      importExportVisible.value = true
    }

    const showExport = () => {
      isExport.value = true
      importExportVisible.value = true
    }

    const showTerminalSettings = () => {
      terminalSettingsVisible.value = true
    }

    const handleTerminalSettingsChanged = async (settings: TerminalSettings) => {
      // 通过事件总线通知所有终端更新设置
      eventBus.emit('terminal-settings-changed', settings)
    }

    const showHistory = () => {
      historyVisible.value = true
    }

    onMounted(async () => {
      await loadConnections()
    })

    return {
      connections,
      dialogVisible,
      currentConfig,
      contextMenuVisible,
      handleMenuClick,
      handleSave,
      showContextMenu,
      handleContextMenuSelect,
      importExportVisible,
      isExport,
      terminalSettingsVisible,
      showImport,
      showExport,
      showTerminalSettings,
      handleTerminalSettingsChanged,
      historyVisible,
      showHistory
    }
  }
})
</script>

<style scoped>
.connection-manager {
  height: 100%;
  position: relative;
}
</style> 