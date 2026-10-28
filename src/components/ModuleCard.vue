<script setup lang="ts">
import type { ModuleInfo } from '@/lib/modules'

defineProps<{
  module: ModuleInfo
}>()
</script>

<template>
  <RouterLink
    :to="module.path"
    class="card group flex h-full flex-col p-4 transition hover:border-primary-300 hover:shadow-md"
  >
    <div class="flex items-start justify-between gap-3">
      <h3 class="text-base font-semibold text-slate-900">
        {{ module.label }}
      </h3>
      <span
        class="mt-0.5 text-primary-600 transition group-hover:translate-x-0.5"
        aria-hidden="true"
      >
        <svg
          class="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </span>
    </div>
    <p class="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
      {{ module.description }}
    </p>
    <span class="mt-3 text-sm font-medium text-primary-700">
      Buka modul
    </span>
  </RouterLink>
</template>
