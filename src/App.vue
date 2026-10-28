<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Toast from '@/components/Toast.vue'
import { MODULES } from '@/lib/modules'
import { ensureSettings } from '@/lib/storage/db'
import { errorMessage } from '@/lib/storage/errors'
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

onMounted(async () => {
  const result = await ensureSettings()
  if (!result.ok) toastStore.error(errorMessage(result.errors))
})

const primaryNav = [
  { to: '/', label: 'Dashboard', shortLabel: 'Dashboard' },
  ...MODULES.map((module) => ({
    to: module.path,
    label: module.label,
    shortLabel: module.shortLabel,
  })),
]

const secondaryNav = [
  { to: '/riwayat', label: 'Riwayat' },
  { to: '/pricing', label: 'Paket & Upgrade' },
  { to: '/panduan', label: 'Panduan' },
  { to: '/settings', label: 'Pengaturan' },
]

const drawerElement = ref<HTMLDialogElement | null>(null)

function openMenu(): void {
  drawerElement.value?.showModal()
}

function closeMenu(): void {
  drawerElement.value?.close()
}

function onDrawerClick(event: MouseEvent): void {
  if (event.target === drawerElement.value) closeMenu()
}
</script>

<template>
  <div class="min-h-dvh bg-slate-50 text-slate-900 lg:pl-64">
    <aside
      class="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex"
      aria-label="Navigasi samping"
    >
      <div class="flex items-center gap-3 px-5 py-5">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-xs font-bold text-white"
          aria-hidden="true"
        >
          HP
        </span>
        <div>
          <p class="text-base font-semibold tracking-tight text-slate-900">
            HematPintar
          </p>
          <p class="text-xs text-slate-500">Keputusan finansial lebih tenang</p>
        </div>
      </div>

      <nav class="flex-1 overflow-y-auto px-3 pb-6" aria-label="Menu utama">
        <p class="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Utama
        </p>
        <RouterLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          class="mb-1 flex items-center rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          exact-active-class="bg-primary-50 font-semibold text-primary-700 hover:bg-primary-50"
        >
          {{ item.label }}
        </RouterLink>

        <p class="px-3 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Lainnya
        </p>
        <RouterLink
          v-for="item in secondaryNav"
          :key="item.to"
          :to="item.to"
          class="mb-1 flex items-center rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          exact-active-class="bg-primary-50 font-semibold text-primary-700 hover:bg-primary-50"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <p class="border-t border-slate-200 px-5 py-4 text-xs leading-relaxed text-slate-500">
        Data disimpan di perangkat ini. Unduh backup dari Pengaturan.
      </p>
    </aside>

    <header
      class="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur lg:hidden"
    >
      <div class="flex items-center justify-between gap-3 px-4 py-3">
        <RouterLink to="/" class="flex items-center gap-2.5">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-[11px] font-bold text-white"
            aria-hidden="true"
          >
            HP
          </span>
          <span class="text-base font-semibold tracking-tight">HematPintar</span>
        </RouterLink>

        <button type="button" class="btn btn-secondary" @click="openMenu">
          Menu
        </button>
      </div>
    </header>

    <dialog
      ref="drawerElement"
      class="m-0 h-dvh max-h-none w-80 max-w-[85vw] overflow-y-auto rounded-none border-0 bg-white p-0 text-slate-900 shadow-xl"
      aria-label="Menu aplikasi"
      @click="onDrawerClick"
    >
      <div class="flex min-h-full flex-col">
        <div class="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-[11px] font-bold text-white"
              aria-hidden="true"
            >
              HP
            </span>
            <span class="text-base font-semibold">HematPintar</span>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Tutup menu"
            @click="closeMenu"
          >
            <svg
              class="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              aria-hidden="true"
            >
              <path stroke-linecap="round" d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <nav class="flex-1 px-3 py-4" aria-label="Menu aplikasi">
          <p class="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Utama
          </p>
          <RouterLink
            v-for="item in primaryNav"
            :key="item.to"
            :to="item.to"
            class="mb-1 block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            exact-active-class="bg-primary-50 font-semibold text-primary-700 hover:bg-primary-50"
            @click="closeMenu"
          >
            {{ item.label }}
          </RouterLink>

          <p class="px-3 pb-2 pt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Lainnya
          </p>
          <RouterLink
            v-for="item in secondaryNav"
            :key="item.to"
            :to="item.to"
            class="mb-1 block rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
            exact-active-class="bg-primary-50 font-semibold text-primary-700 hover:bg-primary-50"
            @click="closeMenu"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <p class="border-t border-slate-200 px-5 py-4 text-xs leading-relaxed text-slate-500">
          Data disimpan di perangkat ini. Unduh backup dari Pengaturan.
        </p>
      </div>
    </dialog>

    <main class="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8">
      <RouterView />
    </main>

    <nav
      class="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
      aria-label="Navigasi bawah"
    >
      <div class="grid grid-cols-5">
        <RouterLink
          v-for="item in primaryNav"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center gap-1 border-t-2 border-transparent px-1 py-2 text-center text-[11px] font-medium text-slate-500"
          exact-active-class="border-primary-600 bg-primary-50/60 text-primary-700"
        >
          <span class="leading-tight">{{ item.shortLabel }}</span>
        </RouterLink>
      </div>
    </nav>

    <Toast />
  </div>
</template>
