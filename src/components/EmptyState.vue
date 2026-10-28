<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  { description: '' },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center px-4 py-10 text-center">
    <div
      class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500"
      aria-hidden="true"
    >
      <svg
        class="h-6 w-6"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M8 7h8m-8 4h8m-8 4h5M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        />
      </svg>
    </div>
    <h2 class="text-base font-semibold text-slate-900">{{ title }}</h2>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-slate-600">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-4">
      <slot />
    </div>
  </div>
</template>
