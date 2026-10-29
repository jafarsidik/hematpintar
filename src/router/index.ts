import { createRouter, createWebHistory } from 'vue-router'

// Current pages keep their local-only functionality, so no route sets
// meta.requiresAuth by default. Account-only routes can opt in later, or the
// deployment can set VITE_REQUIRE_LOGIN=true to protect every page except login.
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: () => import('@/views/DashboardView.vue'),
    },
    {
      path: '/rumah-tangga',
      name: 'household',
      component: () => import('@/views/HouseholdView.vue'),
    },
    {
      path: '/margin-rescue',
      name: 'margin',
      component: () => import('@/views/MarginView.vue'),
    },
    {
      path: '/reseller',
      name: 'reseller',
      component: () => import('@/views/ResellerView.vue'),
    },
    {
      path: '/paket-hemat',
      name: 'bundle',
      component: () => import('@/views/BundleView.vue'),
    },
    {
      path: '/riwayat',
      name: 'history',
      component: () => import('@/views/HistoryView.vue'),
    },
    {
      path: '/pricing',
      name: 'pricing',
      component: () => import('@/views/PricingView.vue'),
    },
    {
      path: '/panduan',
      name: 'guide',
      component: () => import('@/views/GuideView.vue'),
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/SettingsView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
  ],
})

export default router
