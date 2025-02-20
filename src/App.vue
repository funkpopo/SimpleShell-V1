<template>
  <a-layout class="layout">
    <a-layout-sider collapsible>
      <ConnectionManager @select-connection="handleSelectConnection" />
    </a-layout-sider>
    <a-layout>
      <a-layout-content>
        <TabManager 
          v-if="selectedConfig"
          :initial-config="selectedConfig"
          @add-connection="showConnectionDialog"
        />
        <div v-else class="welcome">
          <a-empty description="请从左侧选择或添加SSH连接">
            <template #image>
              <icon-robot :style="{fontSize: '64px'}" />
            </template>
            <a-button type="primary" @click="showConnectionDialog">
              添加连接
            </a-button>
          </a-empty>
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import ConnectionManager from './components/ConnectionManager.vue'
import TabManager from './components/TabManager.vue'
import type { SSHConfig } from './services/ConfigService'

export default defineComponent({
  name: 'App',
  components: {
    ConnectionManager,
    TabManager
  },
  setup() {
    const selectedConfig = ref<SSHConfig | null>(null)

    const handleSelectConnection = (config: SSHConfig) => {
      selectedConfig.value = config
    }

    const showConnectionDialog = () => {
      // 触发ConnectionManager中的添加连接对话框
      // 这里可以通过事件总线或其他方式实现
    }

    return {
      selectedConfig,
      handleSelectConnection,
      showConnectionDialog
    }
  }
})
</script>

<style>
.layout {
  height: 100vh;
}

.welcome {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style> 