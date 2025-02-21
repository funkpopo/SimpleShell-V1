<template>
  <div class="file-tree">
    <div class="tree-header">
      <el-button type="primary" size="small" @click="addConnection">
        新建连接
      </el-button>
    </div>
    <el-tree :data="connections" :props="defaultProps">
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { ref as vueRef } from '@vue/runtime-core'

const connections = vueRef([])
const defaultProps = {
  children: 'children',
  label: 'name'
}

const addConnection = () => {
  // TODO: 实现添加连接逻辑
}
</script>

<style scoped>
.file-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.tree-header {
  padding: 10px;
}
</style> 