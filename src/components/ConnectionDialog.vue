<template>
  <a-modal
    :visible="visible"
    :title="isEdit ? '编辑连接' : '新建连接'"
    @cancel="handleCancel"
    @ok="handleOk"
  >
    <a-form :model="form" :rules="rules" ref="formRef">
      <a-form-item field="name" label="连接名称">
        <a-input v-model="form.name" placeholder="请输入连接名称" />
      </a-form-item>
      
      <a-form-item field="host" label="主机地址">
        <a-input v-model="form.host" placeholder="请输入主机地址" />
      </a-form-item>
      
      <a-form-item field="port" label="端口">
        <a-input-number v-model="form.port" :min="1" :max="65535" />
      </a-form-item>
      
      <a-form-item field="username" label="用户名">
        <a-input v-model="form.username" placeholder="请输入用户名" />
      </a-form-item>
      
      <a-form-item field="password" label="密码">
        <a-input-password v-model="form.password" placeholder="请输入密码" />
      </a-form-item>

      <a-form-item field="privateKey" label="私钥">
        <a-textarea
          v-model="form.privateKey"
          placeholder="可选: 输入私钥内容"
          :auto-size="{ minRows: 2, maxRows: 6 }"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script lang="ts">
import { defineComponent, ref, PropType } from 'vue'
import { Message } from '@arco-design/web-vue'
import { SSHConfig } from '@/services/ConfigService'

export default defineComponent({
  name: 'ConnectionDialog',
  props: {
    visible: {
      type: Boolean,
      required: true
    },
    config: {
      type: Object as PropType<SSHConfig>,
      default: null
    }
  },
  emits: ['update:visible', 'save'],
  setup(props, { emit }) {
    const formRef = ref()
    const isEdit = ref(false)
    
    const form = ref({
      name: '',
      host: '',
      port: 22,
      username: '',
      password: '',
      privateKey: ''
    })

    const rules = {
      name: [{ required: true, message: '请输入连接名称' }],
      host: [{ required: true, message: '请输入主机地址' }],
      port: [{ required: true, message: '请输入端口号' }],
      username: [{ required: true, message: '请输入用户名' }]
    }

    const handleCancel = () => {
      emit('update:visible', false)
    }

    const handleOk = async () => {
      try {
        await formRef.value.validate()
        emit('save', form.value)
        emit('update:visible', false)
        Message.success('保存成功')
      } catch (err) {
        Message.error('请检查表单内容')
      }
    }

    return {
      formRef,
      isEdit,
      form,
      rules,
      handleCancel,
      handleOk
    }
  }
})
</script> 