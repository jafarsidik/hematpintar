<script setup lang="ts">
import ModulePlaceholder from '@/components/ModulePlaceholder.vue'
import { moduleInfo } from '@/lib/modules'

const moduleData = moduleInfo('reseller')
</script>

<template>
  <ModulePlaceholder :module="moduleData" />
</template>
