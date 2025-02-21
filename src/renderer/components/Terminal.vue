<template>
  <div class="terminal-wrapper" ref="terminalEl"></div>
</template>

<script>
import { defineComponent, ref, onMounted, onBeforeUnmount } from 'vue'
import { Terminal as Xterm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { WebLinksAddon } from 'xterm-addon-web-links'
import 'xterm/css/xterm.css'

export default defineComponent({
  name: 'Terminal',
  props: {
    id: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const terminalEl = ref(null)
    let terminal = null
    let fitAddon = null
    
    const initTerminal = () => {
      terminal = new Xterm({
        theme: {
          background: '#1e1e1e',
          foreground: '#ffffff'
        },
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        cursorBlink: true
      })
      
      fitAddon = new FitAddon()
      terminal.loadAddon(fitAddon)
      terminal.loadAddon(new WebLinksAddon())
      
      terminal.open(terminalEl.value)
      fitAddon.fit()
      
      // 连接到SSH
      window.electron.ipcRenderer.send('terminal:connect', {
        id: props.id
      })
      
      // 接收数据
      window.electron.ipcRenderer.on(`terminal:data:${props.id}`, (data) => {
        terminal.write(data)
      })
      
      // 发送数据
      terminal.onData(data => {
        window.electron.ipcRenderer.send('terminal:input', {
          id: props.id,
          data
        })
      })
    }
    
    onMounted(() => {
      initTerminal()
      
      window.addEventListener('resize', () => {
        fitAddon?.fit()
      })
    })
    
    onBeforeUnmount(() => {
      terminal?.dispose()
      window.electron.ipcRenderer.send('terminal:disconnect', {
        id: props.id
      })
    })

    return {
      terminalEl
    }
  }
})
</script>

<style scoped>
.terminal-wrapper {
  height: 100%;
  padding: 10px;
}
</style> 