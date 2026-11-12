import { createApp } from 'vue'
import './style.css'
import { createVfm, VueFinalModal } from 'vue-final-modal'
import 'vue-final-modal/style.css'
import App from './App.vue'
import { router } from './router/index.js'

const app = createApp(App)
const vfm = createVfm()

app.use(router)
app.use(vfm)
app.component('VueFinalModal', VueFinalModal)

app.mount('#app')
