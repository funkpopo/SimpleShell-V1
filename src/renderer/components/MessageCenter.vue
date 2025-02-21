<template>
  <div class="message-center">
    <el-alert
      v-for="msg in messages"
      :key="msg.id"
      :title="msg.title"
      :type="msg.type"
      :description="msg.description"
      show-icon
      :closable="true"
      @close="removeMessage(msg.id)"
    />
  </div>
</template>

<script>
import { defineComponent, ref } from 'vue'

export default defineComponent({
  name: 'MessageCenter',
  setup() {
    const messages = ref([])
    let messageId = 0

    const addMessage = (message) => {
      const id = messageId++
      messages.value.push({
        id,
        ...message,
        timestamp: Date.now()
      })

      // 自动移除
      setTimeout(() => {
        removeMessage(id)
      }, 5000)
    }

    const removeMessage = (id) => {
      const index = messages.value.findIndex(msg => msg.id === id)
      if (index > -1) {
        messages.value.splice(index, 1)
      }
    }

    return {
      messages,
      addMessage,
      removeMessage
    }
  }
})
</script>

<style scoped>
.message-center {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 400px;
}
</style> 