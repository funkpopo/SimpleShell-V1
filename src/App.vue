<template>
  <div class="app-container">
    <!-- 顶部标签栏 -->
    <div class="tab-bar">
      <el-tabs v-model="activeTab" type="card" @tab-click="handleTabClick">
        <el-tab-pane name="home" label="主页" />
        <el-tab-pane name="settings" label="设置" />
      </el-tabs>
    </div>

    <!-- 内容区域 -->
    <div class="content-area">
      <router-view></router-view>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'

export default defineComponent({
  name: 'App',
  setup() {
    const router = useRouter()
    const route = useRoute()
    const activeTab = ref('home')

    // 根据当前路由设置激活的标签
    const updateActiveTab = () => {
      const path = route.path
      switch (path) {
        case '/':
          activeTab.value = 'home'
          break
        case '/settings':
          activeTab.value = 'settings'
          break
      }
    }

    // 监听路由变化
    router.afterEach(() => {
      updateActiveTab()
    })

    // 初始化时设置激活的标签
    updateActiveTab()

    const handleTabClick = (tab: any) => {
      switch (tab.props.name) {
        case 'home':
          router.push('/')
          break
        case 'settings':
          router.push('/settings')
          break
      }
    }

    return {
      activeTab,
      handleTabClick
    }
  }
})
</script>

<style lang="scss">
html, body {
  margin: 0;
  padding: 0;
  font-family: 'Consolas', monospace;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #1e1e1e;
  color: #fff;

  .tab-bar {
    background-color: #2d2d2d;
    border-bottom: 1px solid #333;
    
    .el-tabs {
      --el-text-color-primary: #fff;
      
      .el-tabs__header {
        margin: 0;
        border-bottom: none;
      }
      
      .el-tabs__nav {
        border: none;
      }
      
      .el-tabs__item {
        color: #fff;
        border: none;
        background-color: transparent;
        
        &.is-active {
          background-color: #1e1e1e;
        }
        
        &:hover {
          color: #409eff;
        }
      }
    }
  }

  .content-area {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: row;
    position: relative;
    padding: 0;
    margin: 0;
  }
}
</style> 