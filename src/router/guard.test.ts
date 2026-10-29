import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import {
  installAuthGuard,
  safeRedirectPath,
  type AuthGuardStore,
} from './guard'

const Dummy = { template: '<div />' }

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: Dummy },
  {
    path: '/protected',
    name: 'protected',
    component: Dummy,
    meta: { requiresAuth: true },
  },
  { path: '/login', name: 'login', component: Dummy },
]

function makeAuth(overrides: Partial<AuthGuardStore> = {}): AuthGuardStore {
  return {
    initialized: true,
    isAuthenticated: false,
    initialize: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}

describe('route guard', () => {
  it('mengizinkan halaman publik saat login tidak diwajibkan', async () => {
    const router = makeRouter()
    installAuthGuard(router, makeAuth(), false)

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('home')
  })

  it('mengalihkan halaman meta.requiresAuth ke login dengan redirect asal', async () => {
    const router = makeRouter()
    installAuthGuard(router, makeAuth(), false)

    await router.push('/protected')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/protected')
  })

  it('mengizinkan halaman requiresAuth bila sudah login', async () => {
    const router = makeRouter()
    installAuthGuard(router, makeAuth({ isAuthenticated: true }), false)

    await router.push('/protected')

    expect(router.currentRoute.value.name).toBe('protected')
  })

  it('mewajibkan login untuk semua halaman kecuali login saat flag aktif', async () => {
    const router = makeRouter()
    installAuthGuard(router, makeAuth(), true)

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/')

    await router.push('/login')

    expect(router.currentRoute.value.name).toBe('login')
  })

  it('mengizinkan semua halaman setelah login saat flag aktif', async () => {
    const router = makeRouter()
    installAuthGuard(router, makeAuth({ isAuthenticated: true }), true)

    await router.push('/protected')

    expect(router.currentRoute.value.name).toBe('protected')
  })

  it('menunggu inisialisasi sesi sebelum memutuskan halaman terlindungi', async () => {
    const authStore = makeAuth({ initialized: false })
    authStore.initialize = vi.fn(async () => {
      authStore.initialized = true
      authStore.isAuthenticated = true
    })
    const router = makeRouter()
    installAuthGuard(router, authStore, false)

    await router.push('/protected')

    expect(authStore.initialize).toHaveBeenCalledOnce()
    expect(router.currentRoute.value.name).toBe('protected')
  })

  it('tidak memanggil inisialisasi untuk halaman publik', async () => {
    const authStore = makeAuth({ initialized: false })
    const router = makeRouter()
    installAuthGuard(router, authStore, false)

    await router.push('/')

    expect(authStore.initialize).not.toHaveBeenCalled()
  })
})

describe('safeRedirectPath', () => {
  it('mempertahankan path internal', () => {
    expect(safeRedirectPath('/settings?tab=akun')).toBe('/settings?tab=akun')
    expect(safeRedirectPath('/riwayat')).toBe('/riwayat')
  })

  it('menolak URL eksternal dan nilai yang tidak aman', () => {
    expect(safeRedirectPath('//evil.example')).toBe('/')
    expect(safeRedirectPath('https://evil.example')).toBe('/')
    expect(safeRedirectPath(undefined)).toBe('/')
    expect(safeRedirectPath(123)).toBe('/')
  })
})
