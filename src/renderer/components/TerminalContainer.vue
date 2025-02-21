<template>
  <div class="terminal-container" ref="terminalRef"></div>
</template>

<script setup lang="ts">
import { ref as vueRef, onMounted as vueOnMounted } from '@vue/runtime-core'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

const terminalRef = vueRef<HTMLElement>()

vueOnMounted(() => {
  if (terminalRef.value) {
    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e'
      }
    })
    
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    
    terminal.open(terminalRef.value)
    fitAddon.fit()
  }
})
</script>

<style scoped>
.terminal-container {
  flex: 1;
  padding: 10px;
  background: #1e1e1e;
}
</style> 