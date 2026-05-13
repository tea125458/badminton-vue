import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 1. 引入 VCalendar
import VCalendar from 'v-calendar'
import 'v-calendar/style.css'

import App from './App.vue'
import router from './router'

// Bootstrap 5
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'

// 自訂前台樣式
import './assets/css/frontend.css'

import vue3GoogleLogin from 'vue3-google-login'

// 2. 先建立 app 執行體
const app = createApp(App)

// 3. 接著才是一系列的 .use() 插件
app.use(createPinia())
app.use(router)
app.use(VCalendar, {})

// 註冊 Google Login
app.use(vue3GoogleLogin, {
  clientId: '901309102855-shi28efflfnhvjkjo27askl6ntt3tqv9.apps.googleusercontent.com'
})

// 4. 最後才 mount
app.mount('#app')
