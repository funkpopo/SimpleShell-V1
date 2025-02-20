import { createApp } from 'vue'
import App from '../App.vue'
import ArcoVue from '@arco-design/web-vue'
import '@arco-design/web-vue/dist/arco.css'
import { IconRobot, IconPlus, IconSettings } from '@arco-design/web-vue/es/icon'

const app = createApp(App)

app.use(ArcoVue)
app.component('IconRobot', IconRobot)
app.component('IconPlus', IconPlus)
app.component('IconSettings', IconSettings)

app.mount('#app') 