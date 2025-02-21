<template>
  <div class="tab-bar">
    <div class="tabs">
      <div v-for="tab in tabs" 
           :key="tab.id"
           :class="['tab', { active: tab.id === activeTab }]"
           @click="switchTab(tab.id)">
        <span>{{ tab.title }}</span>
        <el-icon class="close-icon" @click.stop="closeTab(tab.id)">
          <Close />
        </el-icon>
      </div>
    </div>
    
    <el-button class="add-tab" 
               type="text" 
               @click="addNewTab">
      <el-icon><Plus /></el-icon>
    </el-button>
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'
import { Plus, Close } from '@element-plus/icons-vue'

export default defineComponent({
  name: 'TabBar',
  components: { Plus, Close },
  setup() {
    const tabs = ref([
      { id: 1, title: 'Terminal 1' }
    ])
    const activeTab = ref(1)
    
    const addNewTab = () => {
      const newId = tabs.value.length + 1
      tabs.value.push({
        id: newId,
        title: `Terminal ${newId}`
      })
      activeTab.value = newId
    }
    
    const closeTab = (id) => {
      const index = tabs.value.findIndex(tab => tab.id === id)
      tabs.value.splice(index, 1)
      if (activeTab.value === id) {
        activeTab.value = tabs.value[Math.max(0, index - 1)]?.id
      }
    }
    
    const switchTab = (id) => {
      activeTab.value = id
    }

    return {
      tabs,
      activeTab,
      addNewTab,
      closeTab,
      switchTab
    }
  }
})
</script>

<style scoped>
.tab-bar {
  display: flex;
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  padding: 0 10px;
}

.tabs {
  display: flex;
  flex: 1;
  overflow-x: auto;
}

.tab {
  padding: 8px 20px;
  background: #252526;
  border-right: 1px solid #333;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab.active {
  background: #1e1e1e;
  border-bottom: 2px solid #42b983;
}

.close-icon {
  opacity: 0.5;
  font-size: 12px;
}

.close-icon:hover {
  opacity: 1;
}

.add-tab {
  padding: 8px;
}
</style> 