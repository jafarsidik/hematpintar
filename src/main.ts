import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { installAuthGuard } from './router/guard'
import { useAuthStore } from './stores/auth'
import './style.css'

const pinia = createPinia()
const app = createApp(App)

app.use(pinia)
installAuthGuard(
  router,
  useAuthStore(pinia),
  (import.meta.env.VITE_REQUIRE_LOGIN ?? '').toLowerCase() === 'true',
)
app.use(router)
app.mount('#app')
