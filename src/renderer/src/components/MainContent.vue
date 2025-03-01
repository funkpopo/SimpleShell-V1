<script setup lang="ts">
import { ref } from 'vue'

const title = ref('欢迎使用 OShell')
</script>

<template>
  <div class="main-content-container">
    <div class="content-header">
      <h1>{{ title }}</h1>
    </div>
    <div class="content-body">
      <div class="welcome-section">
        <h2>快速开始</h2>
        <div class="quick-actions">
          <div class="action-card">
            <h3>创建新项目</h3>
            <p>开始一个新的项目</p>
          </div>
          <div class="action-card">
            <h3>打开项目</h3>
            <p>打开已有的项目</p>
          </div>
          <div class="action-card">
            <h3>最近项目</h3>
            <p>查看最近的项目</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.main-content-container {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.content-header {
  margin-bottom: 30px;
}

.content-header h1 {
  font-size: 2em;
  font-weight: 600;
  margin: 0;
}

.welcome-section {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section h2 {
  font-size: 1.5em;
  margin-bottom: 20px;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.action-card {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  background-color: rgba(255, 255, 255, 0.15);
}

.action-card h3 {
  margin: 0 0 10px 0;
  font-size: 1.2em;
}

.action-card p {
  margin: 0;
  opacity: 0.8;
}

:deep(.dark-theme) .action-card {
  background-color: rgba(0, 0, 0, 0.2);
}

:deep(.dark-theme) .action-card:hover {
  background-color: rgba(0, 0, 0, 0.3);
}
</style> 