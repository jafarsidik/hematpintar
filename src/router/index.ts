import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue') },
    { path: '/rumah-tangga', name: 'household', component: () => import('@/views/HouseholdView.vue') },
    { path: '/margin-rescue', name: 'margin', component: () => import('@/views/MarginView.vue') },
    { path: '/reseller', name: 'reseller', component: () => import('@/views/ResellerView.vue') },
    { path: '/paket-hemat', name: 'bundle', component: () => import('@/views/BundleView.vue') },
    { path: '/pricing', name: 'pricing', component: () => import('@/views/PricingView.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
  ],
})

export default router
