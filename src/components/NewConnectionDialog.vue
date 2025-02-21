<template>
  <div class="dialog-overlay" v-if="visible" @click="closeDialog">
    <div class="dialog" @click.stop>
      <div class="dialog-header">
        <h3>{{ isEdit ? '编辑连接' : '新建连接' }}</h3>
        <button class="close-btn" @click="closeDialog">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="dialog-content">
        <form @submit.prevent="handleSubmit">
          <div class="form-group">
            <label>名称</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="连接名称"
              required
            />
          </div>

          <div class="form-group">
            <label>主机</label>
            <input
              v-model="form.host"
              type="text"
              placeholder="主机地址"
              required
            />
          </div>

          <div class="form-group">
            <label>端口</label>
            <input
              v-model.number="form.port"
              type="number"
              placeholder="22"
              min="1"
              max="65535"
            />
          </div>

          <div class="form-group">
            <label>用户名</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="用户名"
              required
            />
          </div>

          <div class="form-group">
            <label>认证方式</label>
            <select v-model="form.authType">
              <option value="password">密码</option>
              <option value="privateKey">私钥</option>
            </select>
          </div>

          <div class="form-group" v-if="form.authType === 'password'">
            <label>密码</label>
            <input
              v-model="form.password"
              type="password"
              placeholder="密码"
              required
            />
          </div>

          <div v-if="form.authType === 'privateKey'">
            <div class="form-group">
              <label>私钥文件</label>
              <div class="file-input">
                <input
                  type="text"
                  :value="form.privateKeyPath"
                  placeholder="选择私钥文件"
                  readonly
                />
                <button type="button" @click="selectPrivateKey">浏览</button>
              </div>
            </div>

            <div class="form-group">
              <label>密码短语</label>
              <input
                v-model="form.passphrase"
                type="password"
                placeholder="密码短语（如果有）"
              />
            </div>
          </div>

          <div class="dialog-footer">
            <button type="button" class="btn-cancel" @click="closeDialog">
              取消
            </button>
            <button type="submit" class="btn-submit">
              {{ isEdit ? '保存' : '添加' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, defineProps, defineEmits } from 'vue'
import { dialog } from '@electron/remote'

const props = defineProps({
  visible: Boolean,
  isEdit: Boolean,
  initialData: Object
})

const emit = defineEmits(['close', 'submit'])

const form = ref({
  name: '',
  host: '',
  port: 22,
  username: '',
  authType: 'password',
  password: '',
  privateKeyPath: '',
  passphrase: '',
  ...(props.initialData || {})
})

const closeDialog = () => {
  emit('close')
}

const handleSubmit = () => {
  const data = {
    ...form.value,
    port: form.value.port || 22
  }
  emit('submit', data)
}

const selectPrivateKey = async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: '私钥文件', extensions: ['pem', 'key', 'ppk'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })

  if (!result.canceled && result.filePaths.length > 0) {
    form.value.privateKeyPath = result.filePaths[0]
  }
}
</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog {
  background-color: var(--secondary-bg);
  border-radius: 8px;
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
}

.dialog-content {
  padding: 16px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
}

input,
select {
  width: 100%;
  height: 32px;
  padding: 0 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--primary-bg);
  color: var(--text-color);
  font-size: 14px;
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--active-color);
}

.file-input {
  display: flex;
  gap: 8px;
}

.file-input input {
  flex: 1;
}

.file-input button {
  padding: 0 16px;
  background-color: var(--active-color);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.dialog-footer {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn-cancel,
.btn-submit {
  padding: 0 16px;
  height: 32px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn-cancel {
  background-color: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-color);
}

.btn-submit {
  background-color: var(--active-color);
  color: white;
}

.close-btn {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-color);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background-color: var(--active-color);
  color: white;
}
</style>

