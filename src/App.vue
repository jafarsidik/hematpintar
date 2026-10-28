<script setup lang="ts">
const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/rumah-tangga', label: 'Hemat Rumah Tangga' },
  { to: '/margin-rescue', label: 'Margin Rescue' },
  { to: '/reseller', label: 'Profit Kit Reseller' },
  { to: '/paket-hemat', label: 'Generator Paket Hemat' },
  { to: '/pricing', label: 'Paket & Upgrade' },
  { to: '/settings', label: 'Pengaturan' },
]
</script>

<template>
  <div class="min-h-screen bg-slate-50 text-slate-900">
    <header class="border-b border-slate-200 bg-white">
      <nav
        class="mx-auto flex max-w-4xl flex-wrap items-center gap-1 px-4 py-3"
        aria-label="Navigasi utama"
      >
        <span class="mr-2 text-base font-semibold text-teal-700">HematPintar</span>
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
          exact-active-class="bg-teal-50 font-medium text-teal-700"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
    </header>

    <main class="mx-auto max-w-4xl px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
