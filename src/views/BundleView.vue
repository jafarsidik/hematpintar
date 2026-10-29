<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import InputPersen from '@/components/InputPersen.vue'
import InputQty from '@/components/InputQty.vue'
import InputRupiah from '@/components/InputRupiah.vue'
import ResultCard from '@/components/ResultCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatPercent, formatRupiah } from '@/lib/calc/currency-format'
import {
  biayaPaket,
  diskonMaksimum,
  diskonNominal,
  diskonPersen,
  hargaMinimum,
  hargaNormalPaket,
  labaPaket,
  marginPaket,
  statusPaket,
  totalBiayaRelevanPaket,
  type PaketItem,
  type StatusPaket,
} from '@/lib/calc/bundle'
import type { Result } from '@/lib/calc/result'
import { fileDateStamp } from '@/lib/format-date'
import { simulationsToCsv } from '@/lib/storage/csv'
import { downloadCsv } from '@/lib/storage/download'
import { errorMessage } from '@/lib/storage/errors'
import { getSimulationById } from '@/lib/storage/repository'
import {
  SCHEMA_VERSION,
  bundlePayloadSchema,
  type BundlePayload,
  type SimulationRecord,
} from '@/lib/storage/schemas'
import { useSimulationFeedback } from '@/composables/useSimulationFeedback'
import { useSimulationStore } from '@/stores/simulations'
import { useToastStore } from '@/stores/toast'

interface BundleItemForm {
  rowId: string
  nama: string
  kuantitas: number | null
  biaya: number | null
  hargaNormal: number | null
}

interface BundleForm {
  bundleName: string
  items: BundleItemForm[]
  extraPackagingCost: number | null
  extraVariableSellingCost: number | null
  bundlePrice: number | null
  targetMargin: number | null
}

interface FormIssue {
  field: string
  message: string
}

type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral'

interface StatusView {
  tone: BadgeTone
  label: string
  description: string
}

const route = useRoute()
const router = useRouter()
const simulationStore = useSimulationStore()
const toastStore = useToastStore()
const { reportSaveError } = useSimulationFeedback()

const currentSimulationId = ref<string | null>(null)
const loadingSaved = ref(false)
const saving = ref(false)
const showIssues = ref(false)
const resetOpen = ref(false)
const formElement = ref<HTMLFormElement | null>(null)

function newItem(
  nama = '',
  kuantitas: number | null = null,
  biaya: number | null = null,
  hargaNormal: number | null = null,
): BundleItemForm {
  return {
    rowId: crypto.randomUUID(),
    nama,
    kuantitas,
    biaya,
    hargaNormal,
  }
}

function blankForm(): BundleForm {
  return {
    bundleName: '',
    items: [newItem()],
    extraPackagingCost: 0,
    extraVariableSellingCost: 0,
    bundlePrice: null,
    targetMargin: null,
  }
}

const form = reactive<BundleForm>(blankForm())

const activeItems = computed(() =>
  form.items.filter(
    (row) =>
      row.nama.trim() !== '' ||
      row.kuantitas !== null ||
      row.biaya !== null ||
      row.hargaNormal !== null,
  ),
)

const paketItems = computed<PaketItem[]>(() =>
  activeItems.value.map((row) => ({
    jumlah: row.kuantitas ?? Number.NaN,
    biayaSatuan: row.biaya ?? Number.NaN,
    hargaNormalSatuan: row.hargaNormal ?? Number.NaN,
  })),
)

const biayaKemasanTambahan = computed(() => form.extraPackagingCost ?? 0)
const biayaVariabelPenjualan = computed(
  () => form.extraVariableSellingCost ?? 0,
)

const hargaNormalResult = computed(() =>
  hargaNormalPaket(paketItems.value),
)
const biayaItemResult = computed(() => biayaPaket(paketItems.value, 0))
const biayaPaketResult = computed(() =>
  biayaPaket(paketItems.value, biayaKemasanTambahan.value),
)

const diskonNominalResult = computed(() => {
  if (!hargaNormalResult.value.ok || form.bundlePrice === null) return null
  return diskonNominal(hargaNormalResult.value.value, form.bundlePrice)
})

const diskonPersenResult = computed(() => {
  if (!hargaNormalResult.value.ok || form.bundlePrice === null) return null
  return diskonPersen(hargaNormalResult.value.value, form.bundlePrice)
})

const labaResult = computed(() => {
  if (!biayaPaketResult.value.ok || form.bundlePrice === null) return null
  return labaPaket(
    form.bundlePrice,
    biayaPaketResult.value.value,
    biayaVariabelPenjualan.value,
  )
})

const marginResult = computed(() => {
  if (!labaResult.value?.ok || form.bundlePrice === null) return null
  return marginPaket(labaResult.value.value, form.bundlePrice)
})

const totalBiayaRelevanResult = computed(() => {
  if (!biayaPaketResult.value.ok) return null
  return totalBiayaRelevanPaket(
    biayaPaketResult.value.value,
    biayaVariabelPenjualan.value,
  )
})

const totalBiayaRelevan = computed(() =>
  totalBiayaRelevanResult.value?.ok
    ? totalBiayaRelevanResult.value.value
    : null,
)

const hargaMinimumResult = computed(() => {
  if (totalBiayaRelevan.value === null || form.targetMargin === null) {
    return null
  }
  return hargaMinimum(totalBiayaRelevan.value, form.targetMargin)
})

const diskonMaksimumResult = computed(() => {
  if (!hargaNormalResult.value.ok || !hargaMinimumResult.value?.ok) return null
  return diskonMaksimum(
    hargaNormalResult.value.value,
    hargaMinimumResult.value.value,
  )
})

const statusResult = computed(() => {
  if (
    !labaResult.value?.ok ||
    !marginResult.value?.ok ||
    form.targetMargin === null
  ) {
    return null
  }
  return statusPaket(
    labaResult.value.value,
    marginResult.value.value,
    form.targetMargin,
  )
})

const hargaNormal = computed(() =>
  hargaNormalResult.value.ok ? hargaNormalResult.value.value : null,
)
const biayaItem = computed(() =>
  biayaItemResult.value.ok ? biayaItemResult.value.value : null,
)
const biayaTotal = computed(() =>
  biayaPaketResult.value.ok ? biayaPaketResult.value.value : null,
)
const diskonNominalValue = computed(() =>
  diskonNominalResult.value?.ok ? diskonNominalResult.value.value : null,
)
const diskonPersenValue = computed(() =>
  diskonPersenResult.value?.ok ? diskonPersenResult.value.value : null,
)
const labaValue = computed(() =>
  labaResult.value?.ok ? labaResult.value.value : null,
)
const marginValue = computed(() =>
  marginResult.value?.ok ? marginResult.value.value : null,
)
const hargaMinimumValue = computed(() =>
  hargaMinimumResult.value?.ok ? hargaMinimumResult.value.value : null,
)
const diskonMaksimumValue = computed(() =>
  diskonMaksimumResult.value?.ok ? diskonMaksimumResult.value.value : null,
)
const statusValue = computed<StatusPaket | null>(() =>
  statusResult.value?.ok ? statusResult.value.value : null,
)

const diskonMaksimumError = computed(() => {
  if (!diskonMaksimumResult.value || diskonMaksimumResult.value.ok) return null
  return (
    diskonMaksimumResult.value.errors[0]?.message ??
    'Tidak ada diskon maksimum yang aman untuk target margin ini.'
  )
})

const labaTone = computed(() => {
  if (labaValue.value === null) return 'neutral' as const
  if (labaValue.value < 0) return 'danger' as const
  if (labaValue.value === 0) return 'warning' as const
  return 'success' as const
})

const statusView = computed<StatusView>(() => {
  if (
    statusValue.value === null ||
    labaValue.value === null ||
    marginValue.value === null ||
    form.targetMargin === null ||
    form.bundlePrice === null
  ) {
    return {
      tone: 'neutral',
      label: 'Belum dinilai',
      description:
        'Isi item paket, harga paket, dan target margin untuk menilai status paket.',
    }
  }

  if (statusValue.value === 'rugi') {
    return {
      tone: 'danger',
      label: 'Rugi',
      description: `Harga paket ${formatRupiah(form.bundlePrice)} berada di bawah total biaya relevan ${formatRupiah(totalBiayaRelevan.value ?? 0)}. Laba paket ${formatRupiah(labaValue.value)}.`,
    }
  }

  if (statusValue.value === 'impas') {
    return {
      tone: 'warning',
      label: 'Impas',
      description: `Harga paket ${formatRupiah(form.bundlePrice)} hanya menutup biaya; laba paket Rp0 dan belum ada margin untuk menutup biaya tetap.`,
    }
  }

  if (statusValue.value === 'di_bawah_target') {
    return {
      tone: 'warning',
      label: 'Di bawah target',
      description: `Paket masih untung ${formatRupiah(labaValue.value)} (margin ${formatPercent(marginValue.value)}), tetapi margin tersebut di bawah target ${formatPercent(form.targetMargin)}.`,
    }
  }

  return {
    tone: 'success',
    label: 'Sesuai target',
    description: `Paket untung ${formatRupiah(labaValue.value)} dengan margin ${formatPercent(marginValue.value)}, memenuhi target ${formatPercent(form.targetMargin)}.`,
  }
})

const rekomendasi = computed<string[]>(() => {
  const recommendations: string[] = []
  const target = form.targetMargin
  const price = form.bundlePrice
  const minimum = hargaMinimumValue.value
  const diskonMax = diskonMaksimumValue.value
  const laba = labaValue.value
  const margin = marginValue.value

  if (activeItems.value.length === 0) {
    recommendations.push(
      'Tambahkan minimal satu item paket beserta kuantitas, biaya per unit, dan harga normal per unit.',
    )
    return recommendations
  }

  if (price === null || price <= 0) {
    recommendations.push(
      'Isi harga paket lebih dari 0 agar diskon, laba, dan margin dapat dihitung.',
    )
  } else if (target === null) {
    recommendations.push(
      'Isi target margin untuk menghitung harga minimum dan diskon maksimum.',
    )
  } else if (statusValue.value === 'rugi' && laba !== null) {
    recommendations.push(
      `Harga paket ${formatRupiah(price)} belum menutup total biaya relevan ${formatRupiah(totalBiayaRelevan.value ?? 0)}. Naikkan harga paket atau turunkan biaya item, kemasan, dan biaya penjualan.`,
    )
    if (minimum !== null) {
      recommendations.push(
        `Harga minimum untuk target margin ${formatPercent(target)} adalah ${formatRupiah(minimum)}.`,
      )
    }
  } else if (statusValue.value === 'impas' && minimum !== null) {
    recommendations.push(
      `Harga paket baru menutup biaya. Naikkan harga ke minimal ${formatRupiah(minimum)} agar mencapai target margin ${formatPercent(target)}.`,
    )
  } else if (statusValue.value === 'di_bawah_target' && laba !== null) {
    recommendations.push(
      `Paket masih untung ${formatRupiah(laba)} dengan margin ${formatPercent(margin ?? 0)}, tetapi target margin ${formatPercent(target)} belum tercapai.`,
    )
    if (minimum !== null) {
      recommendations.push(
        `Naikkan harga paket ke minimal ${formatRupiah(minimum)} atau kurangi biaya item, kemasan, dan biaya penjualan.`,
      )
    }
  } else if (statusValue.value === 'sesuai_target' && margin !== null) {
    recommendations.push(
      `Margin paket ${formatPercent(margin)} sudah memenuhi target ${formatPercent(target)}.`,
    )
    if (diskonMax !== null) {
      recommendations.push(
        `Diskon maksimum yang masih aman untuk target ini adalah ${formatRupiah(diskonMax)} dari harga normal ${formatRupiah(hargaNormal.value ?? 0)}.`,
      )
    }
  }

  if (diskonNominalValue.value !== null && diskonNominalValue.value < 0) {
    recommendations.push(
      'Harga paket lebih tinggi dari harga normal. Ini bukan diskon; periksa kembali harga paket atau harga normal item.',
    )
  }

  if (diskonMaksimumError.value) {
    recommendations.push(
      'Harga normal paket tidak cukup untuk mencapai target margin. Jangan menampilkan diskon sebagai aman; naikkan harga normal, turunkan biaya, atau turunkan target margin.',
    )
  }

  if (biayaVariabelPenjualan.value > 0) {
    recommendations.push(
      `Biaya penjualan variabel ${formatRupiah(biayaVariabelPenjualan.value)} sudah mengurangi laba, tetapi tidak dimasukkan ke total biaya paket. Jangan memasukkannya dua kali ke biaya item.`,
    )
  }

  return recommendations
})

const formIssues = computed<FormIssue[]>(() => {
  const issues: FormIssue[] = []

  if (form.bundleName.trim() === '') {
    issues.push({
      field: 'bundleName',
      message: 'Nama paket wajib diisi.',
    })
  }

  if (activeItems.value.length === 0) {
    issues.push({
      field: 'items',
      message: 'Tambahkan minimal satu item paket.',
    })
  }

  activeItems.value.forEach((row) => {
    if (row.nama.trim() === '') {
      issues.push({
        field: `items.${row.rowId}.nama`,
        message: 'Nama item wajib diisi.',
      })
    }
    if (
      row.kuantitas === null ||
      !Number.isFinite(row.kuantitas) ||
      row.kuantitas <= 0
    ) {
      issues.push({
        field: `items.${row.rowId}.kuantitas`,
        message: 'Kuantitas harus lebih besar dari 0.',
      })
    }
    if (
      row.biaya === null ||
      !Number.isFinite(row.biaya) ||
      row.biaya < 0 ||
      !Number.isInteger(row.biaya)
    ) {
      issues.push({
        field: `items.${row.rowId}.biaya`,
        message: 'Biaya per unit wajib diisi dalam Rupiah bulat.',
      })
    }
    if (
      row.hargaNormal === null ||
      !Number.isFinite(row.hargaNormal) ||
      row.hargaNormal < 0 ||
      !Number.isInteger(row.hargaNormal)
    ) {
      issues.push({
        field: `items.${row.rowId}.hargaNormal`,
        message: 'Harga normal per unit wajib diisi dalam Rupiah bulat.',
      })
    }
  })

  if (
    form.extraPackagingCost !== null &&
    (!Number.isFinite(form.extraPackagingCost) ||
      form.extraPackagingCost < 0 ||
      !Number.isInteger(form.extraPackagingCost))
  ) {
    issues.push({
      field: 'extraPackagingCost',
      message: 'Biaya kemasan tambahan harus Rupiah bulat atau dikosongkan.',
    })
  }

  if (
    form.extraVariableSellingCost !== null &&
    (!Number.isFinite(form.extraVariableSellingCost) ||
      form.extraVariableSellingCost < 0 ||
      !Number.isInteger(form.extraVariableSellingCost))
  ) {
    issues.push({
      field: 'extraVariableSellingCost',
      message:
        'Biaya penjualan variabel harus Rupiah bulat atau dikosongkan.',
    })
  }

  if (
    form.bundlePrice === null ||
    !Number.isFinite(form.bundlePrice) ||
    form.bundlePrice <= 0 ||
    !Number.isInteger(form.bundlePrice)
  ) {
    issues.push({
      field: 'bundlePrice',
      message: 'Harga paket harus diisi dalam Rupiah bulat lebih dari 0.',
    })
  }

  if (
    form.targetMargin === null ||
    !Number.isFinite(form.targetMargin) ||
    form.targetMargin < 0 ||
    form.targetMargin >= 1
  ) {
    issues.push({
      field: 'targetMargin',
      message:
        'Target margin wajib diisi antara 0% dan kurang dari 100%.',
    })
  }

  return issues
})

const calculationErrors = computed(() => {
  const results: (Result<unknown> | null)[] = [
    hargaNormalResult.value,
    biayaItemResult.value,
    biayaPaketResult.value,
    diskonNominalResult.value,
    diskonPersenResult.value,
    labaResult.value,
    marginResult.value,
    totalBiayaRelevanResult.value,
    hargaMinimumResult.value,
    statusResult.value,
  ]

  const messages = new Set<string>()
  results.forEach((result) => {
    if (result && !result.ok) {
      result.errors.forEach((error) => messages.add(error.message))
    }
  })
  return [...messages]
})

function issueFor(field: string): string | null {
  if (!showIssues.value) return null
  return formIssues.value.find((issue) => issue.field === field)?.message ?? null
}

function hasVisibleInputError(): boolean {
  return formElement.value?.querySelector('[aria-invalid="true"]') !== null
}

function rowIssue(
  rowId: string,
  field: 'nama' | 'kuantitas' | 'biaya' | 'hargaNormal',
): string | null {
  return issueFor(`items.${rowId}.${field}`)
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

function rupiahOr(value: number | null): string {
  return value === null ? '—' : formatRupiah(value)
}

function percentOr(value: number | null): string {
  return value === null
    ? '—'
    : formatPercent(value, { maximumFractionDigits: 2 })
}

function addItem(): void {
  form.items.push(newItem())
}

function removeItem(index: number): void {
  form.items.splice(index, 1)
}

function isiContoh(): void {
  Object.assign(form, {
    bundleName: 'Paket Hemat Keripik dan Sambal',
    items: [
      newItem('Keripik', 2, 5_000, 8_000),
      newItem('Sambal', 1, 12_000, 15_000),
    ],
    extraPackagingCost: 2_000,
    extraVariableSellingCost: 1_000,
    bundlePrice: 27_000,
    targetMargin: 0.1,
  })
  currentSimulationId.value = null
  showIssues.value = false
  if (route.query.simulation) {
    void router.replace({ path: route.path, query: {} })
  }
}

function applyPayload(payload: BundlePayload): void {
  Object.assign(form, {
    bundleName: payload.bundleName,
    items:
      payload.items.length > 0
        ? payload.items.map((item) =>
            newItem(
              item.nama,
              item.kuantitas,
              item.biaya,
              item.hargaNormal,
            ),
          )
        : [newItem()],
    extraPackagingCost: payload.extraPackagingCost,
    extraVariableSellingCost: payload.extraVariableSellingCost,
    bundlePrice: payload.bundlePrice,
    targetMargin: payload.targetMargin,
  })
}

async function loadSimulation(id: string): Promise<void> {
  loadingSaved.value = true
  const result = await getSimulationById(id)
  loadingSaved.value = false

  if (!result.ok) {
    toastStore.error(errorMessage(result.errors))
    return
  }

  if (!result.value) {
    toastStore.error('Simulasi tidak ditemukan. Membuka form baru.')
    currentSimulationId.value = null
    await router.replace({ path: route.path, query: {} })
    return
  }

  if (result.value.moduleType !== 'bundle') {
    toastStore.error('Simulasi ini bukan simulasi Generator Paket Hemat.')
    return
  }

  const parsed = bundlePayloadSchema.safeParse(result.value.payload)
  if (!parsed.success) {
    toastStore.error(
      parsed.error.issues[0]?.message ??
        'Data simulasi tidak valid dan tidak dapat dibuka.',
    )
    return
  }

  applyPayload(parsed.data)
  currentSimulationId.value = id
  showIssues.value = false
}

watch(
  () => route.query.simulation,
  (value) => {
    const id = Array.isArray(value) ? value[0] : value
    if (typeof id !== 'string' || id.length === 0) return
    if (id === currentSimulationId.value) return
    void loadSimulation(id)
  },
  { immediate: true },
)

function buildPayload(): BundlePayload | null {
  if (form.bundlePrice === null || form.targetMargin === null) return null
  const bundleName = form.bundleName.trim()
  if (bundleName === '') return null

  return {
    bundleName,
    items: activeItems.value.map((row) => ({
      nama: row.nama.trim(),
      kuantitas: row.kuantitas ?? 0,
      biaya: row.biaya ?? 0,
      hargaNormal: row.hargaNormal ?? 0,
    })),
    extraPackagingCost: form.extraPackagingCost ?? 0,
    extraVariableSellingCost: form.extraVariableSellingCost ?? 0,
    bundlePrice: form.bundlePrice,
    targetMargin: form.targetMargin,
  }
}

function hasBlockingErrors(): boolean {
  return (
    formIssues.value.length > 0 ||
    hasVisibleInputError() ||
    calculationErrors.value.length > 0
  )
}

async function save(): Promise<void> {
  showIssues.value = true
  if (hasBlockingErrors()) {
    toastStore.error('Periksa input yang ditandai sebelum menyimpan.')
    return
  }

  const payload = buildPayload()
  if (!payload) {
    toastStore.error('Data belum lengkap untuk disimpan.')
    return
  }

  const wasEditing = currentSimulationId.value !== null
  saving.value = true

  const result = wasEditing
    ? await simulationStore.update(currentSimulationId.value!, {
        name: payload.bundleName,
        payload,
      })
    : await simulationStore.create({
        moduleType: 'bundle',
        name: payload.bundleName,
        payload,
      })

  saving.value = false

  if (!result.ok) {
    reportSaveError(result, 'bundle')
    return
  }

  currentSimulationId.value = result.value.id
  showIssues.value = false
  await router.replace({
    path: route.path,
    query: { simulation: result.value.id },
  })
  toastStore.success(
    wasEditing
      ? 'Perubahan simulasi berhasil disimpan.'
      : 'Simulasi berhasil disimpan.',
  )
}

async function duplicateCurrent(): Promise<void> {
  if (currentSimulationId.value === null) return

  const result = await simulationStore.duplicate(currentSimulationId.value)
  if (!result.ok) {
    reportSaveError(result, 'bundle')
    return
  }

  currentSimulationId.value = result.value.id
  const parsed = bundlePayloadSchema.safeParse(result.value.payload)
  if (parsed.success) applyPayload(parsed.data)
  await router.replace({
    path: route.path,
    query: { simulation: result.value.id },
  })
  toastStore.success('Simulasi diduplikasi. Anda sedang membuka salinannya.')
}

function resetForm(): void {
  Object.assign(form, blankForm())
  currentSimulationId.value = null
  showIssues.value = false
  resetOpen.value = false
  void router.replace({ path: route.path, query: {} })
  toastStore.info('Form dikosongkan. Data yang sudah tersimpan tidak dihapus.')
}

function exportCsv(): void {
  showIssues.value = true
  if (hasBlockingErrors()) {
    toastStore.error('Periksa input yang ditandai sebelum mengekspor CSV.')
    return
  }

  const payload = buildPayload()
  if (!payload) {
    toastStore.error('Data belum lengkap untuk diekspor.')
    return
  }

  const timestamp = new Date().toISOString()
  const record: SimulationRecord = {
    id: currentSimulationId.value ?? crypto.randomUUID(),
    moduleType: 'bundle',
    name: payload.bundleName,
    payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: SCHEMA_VERSION,
  }

  const csv = simulationsToCsv('bundle', [record])
  downloadCsv(`hematpintar-paket-hemat-${fileDateStamp()}.csv`, csv)
  toastStore.success('CSV simulasi Generator Paket Hemat berhasil diunduh.')
}
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-medium text-primary-700">Generator Paket Hemat</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Susun paket yang tetap menguntungkan
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Masukkan komponen paket, biaya, dan harga normalnya. Diskon, laba, dan
          margin dihitung langsung saat input berubah memakai mesin kalkulasi
          yang sama dengan pengujian.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <StatusBadge
          v-if="currentSimulationId"
          label="Mode edit simulasi tersimpan"
          tone="info"
        />
        <button type="button" class="btn btn-secondary" @click="isiContoh">
          Isi contoh
        </button>
      </div>
    </header>

    <p v-if="loadingSaved" class="text-sm text-slate-600" aria-live="polite">
      Memuat simulasi tersimpan...
    </p>

    <form ref="formElement" class="space-y-6" novalidate @submit.prevent="save">
      <section class="card p-5" aria-labelledby="judul-paket">
        <h2 id="judul-paket" class="text-base font-semibold text-slate-900">
          Nama dan harga paket
        </h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div class="md:col-span-2 xl:col-span-1">
            <label for="bundle-nama-paket" class="label-base">
              Nama paket
              <span class="text-error-600" aria-hidden="true">*</span>
            </label>
            <input
              id="bundle-nama-paket"
              v-model="form.bundleName"
              type="text"
              class="input-base"
              maxlength="120"
              autocomplete="off"
              :aria-invalid="issueFor('bundleName') ? 'true' : undefined"
            />
            <p
              v-if="issueFor('bundleName')"
              class="mt-1.5 text-sm text-error-600"
              role="alert"
            >
              {{ issueFor('bundleName') }}
            </p>
          </div>

          <InputRupiah
            v-model="form.bundlePrice"
            label="Harga jual paket"
            hint="Harga yang dibayar pembeli untuk seluruh paket."
            required
            :error="issueFor('bundlePrice')"
          />

          <InputPersen
            v-model="form.targetMargin"
            label="Target margin (%)"
            hint="Contoh: 10 untuk target margin 10%."
            :min="0"
            :max="99.99"
            required
            :error="issueFor('targetMargin')"
          />
        </div>
      </section>

      <section class="card p-5" aria-labelledby="judul-item">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="judul-item" class="text-base font-semibold text-slate-900">
              Item dalam paket
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              Masukkan kuantitas dan biaya per unit yang benar-benar dipakai
              untuk paket ini.
            </p>
          </div>
          <button type="button" class="btn btn-secondary" @click="addItem">
            Tambah item
          </button>
        </div>

        <p
          v-if="issueFor('items')"
          class="mt-3 text-sm text-error-600"
          role="alert"
        >
          {{ issueFor('items') }}
        </p>

        <div class="mt-4 space-y-4">
          <fieldset
            v-for="(row, index) in form.items"
            :key="row.rowId"
            class="rounded-lg border border-slate-200 p-4"
          >
            <legend class="px-1 text-sm font-semibold text-slate-700">
              Item {{ index + 1 }}
            </legend>

            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label :for="`item-nama-${row.rowId}`" class="label-base">
                  Nama item
                </label>
                <input
                  :id="`item-nama-${row.rowId}`"
                  v-model="row.nama"
                  type="text"
                  class="input-base"
                  autocomplete="off"
                  maxlength="120"
                  :aria-invalid="
                    rowIssue(row.rowId, 'nama') ? 'true' : undefined
                  "
                />
                <p
                  v-if="rowIssue(row.rowId, 'nama')"
                  class="mt-1.5 text-sm text-error-600"
                  role="alert"
                >
                  {{ rowIssue(row.rowId, 'nama') }}
                </p>
              </div>

              <InputQty
                v-model="row.kuantitas"
                label="Kuantitas"
                hint="Jumlah unit item ini di dalam paket."
                :min="0"
                :step="1"
                positive
                :error="rowIssue(row.rowId, 'kuantitas')"
              />

              <InputRupiah
                v-model="row.biaya"
                label="Biaya per unit"
                hint="Biaya pokok satu unit item."
                :error="rowIssue(row.rowId, 'biaya')"
              />

              <InputRupiah
                v-model="row.hargaNormal"
                label="Harga normal per unit"
                hint="Harga jual normal item jika dibeli terpisah."
                :error="rowIssue(row.rowId, 'hargaNormal')"
              />
            </div>

            <div class="mt-3 flex justify-end">
              <button
                type="button"
                class="btn btn-ghost text-error-700 hover:bg-error-50"
                :aria-label="`Hapus item ${index + 1}`"
                @click="removeItem(index)"
              >
                Hapus item
              </button>
            </div>
          </fieldset>
        </div>
      </section>

      <section class="card p-5" aria-labelledby="judul-biaya-tambahan">
        <h2 id="judul-biaya-tambahan" class="text-base font-semibold text-slate-900">
          Biaya tambahan paket
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          Isi hanya biaya yang belum masuk ke biaya per unit item. Jangan
          menghitung biaya yang sama dua kali.
        </p>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <InputRupiah
            v-model="form.extraPackagingCost"
            label="Biaya kemasan tambahan"
            hint="Kotak, label, atau kemasan khusus paket. Kosongkan jika Rp0."
            :error="issueFor('extraPackagingCost')"
          />
          <InputRupiah
            v-model="form.extraVariableSellingCost"
            label="Biaya penjualan variabel"
            hint="Misalnya biaya transaksi atau ongkir subsidi yang relevan. Kosongkan jika Rp0."
            :error="issueFor('extraVariableSellingCost')"
          />
        </div>
      </section>

      <div
        v-if="showIssues && formIssues.length > 0"
        class="rounded-lg border border-error-200 bg-error-50 p-4 text-sm text-error-700"
        role="alert"
      >
        <p class="font-medium">Periksa input berikut:</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="issue in formIssues" :key="issue.field">
            {{ issue.message }}
          </li>
        </ul>
      </div>
    </form>

    <section aria-labelledby="judul-hasil">
      <h2 id="judul-hasil" class="mb-3 text-base font-semibold text-slate-900">
        Hasil utama
      </h2>

      <div
        v-if="calculationErrors.length > 0"
        class="mb-4 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700"
        role="alert"
      >
        <p class="font-medium">Perhitungan belum lengkap</p>
        <ul class="mt-2 list-disc space-y-1 pl-5">
          <li v-for="message in calculationErrors" :key="message">
            {{ message }}
          </li>
        </ul>
      </div>

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ResultCard
          data-testid="harga-normal-paket"
          title="Harga normal paket"
          :value="rupiahOr(hargaNormal)"
          tone="primary"
          description="Total harga normal seluruh item sesuai kuantitas paket."
        />
        <ResultCard
          data-testid="total-biaya-paket"
          title="Total biaya paket"
          :value="rupiahOr(biayaTotal)"
          tone="primary"
          description="Biaya item + kemasan tambahan. Biaya penjualan variabel dihitung terpisah."
        />
        <ResultCard
          data-testid="diskon-nominal"
          title="Diskon nominal"
          :value="rupiahOr(diskonNominalValue)"
          :tone="
            diskonNominalValue !== null && diskonNominalValue < 0
              ? 'warning'
              : 'neutral'
          "
          :description="
            diskonNominalValue !== null && diskonNominalValue < 0
              ? 'Harga paket lebih mahal dari harga normal; nilai ini bukan diskon.'
              : 'Harga normal paket − harga paket.'
          "
        />
        <ResultCard
          data-testid="diskon-persen"
          title="Diskon"
          :value="percentOr(diskonPersenValue)"
          tone="neutral"
          description="Diskon nominal ÷ harga normal paket."
        />
        <ResultCard
          data-testid="laba-paket"
          title="Laba paket"
          :value="rupiahOr(labaValue)"
          :tone="labaTone"
          description="Harga paket − total biaya paket − biaya penjualan variabel."
        />
        <ResultCard
          data-testid="margin-paket"
          title="Margin paket"
          :value="percentOr(marginValue)"
          :tone="labaTone"
          description="Laba paket ÷ harga paket."
        />
        <ResultCard
          data-testid="harga-minimum-paket"
          title="Harga minimum target margin"
          :value="rupiahOr(hargaMinimumValue)"
          tone="success"
          description="(Total biaya paket + biaya penjualan variabel) ÷ (1 − target margin), dibulatkan ke atas."
        />
        <ResultCard
          data-testid="diskon-maksimum"
          title="Diskon maksimum"
          :value="rupiahOr(diskonMaksimumValue)"
          :tone="diskonMaksimumError ? 'warning' : 'neutral'"
          :description="
            diskonMaksimumError ??
            'Harga normal paket − harga minimum target margin.'
          "
          :status-label="diskonMaksimumError ? 'Tidak tersedia' : ''"
          :status-tone="diskonMaksimumError ? 'warning' : 'neutral'"
        />
        <ResultCard
          data-testid="status-paket"
          title="Status paket"
          :value="statusView.label"
          :tone="statusView.tone"
          :description="statusView.description"
        />
      </div>
    </section>

    <section class="card p-5" aria-labelledby="judul-rincian">
      <h2 id="judul-rincian" class="text-base font-semibold text-slate-900">
        Rincian perhitungan
      </h2>

      <div v-if="activeItems.length > 0" class="mt-4 space-y-2">
        <div
          v-for="(row, index) in activeItems"
          :key="row.rowId"
          class="flex flex-col justify-between gap-1 rounded-lg bg-slate-50 px-3 py-2 text-sm sm:flex-row sm:items-center sm:gap-4"
        >
          <span class="font-medium text-slate-800">
            {{ index + 1 }}. {{ row.nama || 'Item tanpa nama' }}
          </span>
          <span class="text-slate-600">
            {{ row.kuantitas === null ? '—' : `${numberFormat(row.kuantitas)} ×` }}
            {{ rupiahOr(row.hargaNormal) }} normal ·
            {{ rupiahOr(row.biaya) }} biaya
          </span>
        </div>
      </div>

      <dl class="mt-4 divide-y divide-slate-100 text-sm">
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya item</dt>
          <dd class="font-medium text-slate-900">{{ rupiahOr(biayaItem) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Kemasan tambahan</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaKemasanTambahan) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="font-medium text-slate-700">Total biaya paket</dt>
          <dd class="font-semibold text-slate-900">{{ rupiahOr(biayaTotal) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya penjualan variabel</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaVariabelPenjualan) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="font-medium text-slate-700">Total biaya relevan</dt>
          <dd class="font-semibold text-slate-900">
            {{ rupiahOr(totalBiayaRelevan) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Harga normal paket</dt>
          <dd class="font-medium text-slate-900">{{ rupiahOr(hargaNormal) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Harga paket</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(form.bundlePrice) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Diskon nominal</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(diskonNominalValue) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Diskon persen</dt>
          <dd class="font-medium text-slate-900">
            {{ percentOr(diskonPersenValue) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Laba paket</dt>
          <dd class="font-medium text-slate-900">{{ rupiahOr(labaValue) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Margin paket</dt>
          <dd class="font-medium text-slate-900">{{ percentOr(marginValue) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Harga minimum target margin</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(hargaMinimumValue) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Diskon maksimum</dt>
          <dd class="font-medium text-slate-900">
            {{ diskonMaksimumError ? 'Tidak tersedia' : rupiahOr(diskonMaksimumValue) }}
          </dd>
        </div>
      </dl>

      <p v-if="diskonMaksimumError" class="mt-3 text-sm text-warning-700">
        {{ diskonMaksimumError }}
      </p>
      <p class="mt-3 text-xs leading-relaxed text-slate-500">
        Harga normal paket = Σ (kuantitas × harga normal per unit). Total biaya
        paket = Σ (kuantitas × biaya per unit) + kemasan tambahan. Laba paket =
        harga paket − total biaya paket − biaya penjualan variabel. Margin
        paket = laba paket ÷ harga paket; bukan markup.
      </p>
    </section>

    <section class="card p-5" aria-labelledby="judul-rekomendasi">
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="judul-rekomendasi" class="text-base font-semibold text-slate-900">
          Status dan rekomendasi
        </h2>
        <StatusBadge :label="statusView.label" :tone="statusView.tone" />
      </div>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        {{ statusView.description }}
      </p>

      <ul v-if="rekomendasi.length > 0" class="mt-4 space-y-2">
        <li
          v-for="item in rekomendasi"
          :key="item"
          class="flex gap-2 text-sm leading-relaxed text-slate-700"
        >
          <svg
            class="mt-0.5 h-4 w-4 shrink-0 text-primary-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14m-5-5 5 5-5 5" />
          </svg>
          <span>{{ item }}</span>
        </li>
      </ul>
      <p v-else class="mt-3 text-sm text-slate-600">
        Rekomendasi akan muncul setelah data utama lengkap.
      </p>
      <p class="mt-3 text-xs text-slate-500">
        Rekomendasi dibuat dari aturan perhitungan, bukan analisis AI.
      </p>
    </section>

    <section class="card p-5" aria-labelledby="judul-aksi">
      <h2 id="judul-aksi" class="text-base font-semibold text-slate-900">
        Aksi
      </h2>
      <div class="mt-4 flex flex-wrap gap-2">
        <button type="button" class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? 'Menyimpan...' : currentSimulationId ? 'Simpan perubahan' : 'Simpan' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="!currentSimulationId"
          :title="
            currentSimulationId
              ? 'Duplikasi simulasi tersimpan'
              : 'Simpan simulasi terlebih dahulu untuk menduplikasi'
          "
          @click="duplicateCurrent"
        >
          Duplikat
        </button>
        <button type="button" class="btn btn-secondary" @click="exportCsv">
          Ekspor CSV
        </button>
        <button type="button" class="btn btn-ghost" @click="resetOpen = true">
          Reset
        </button>
      </div>
      <p v-if="!currentSimulationId" class="mt-2 text-xs text-slate-500">
        Duplikat tersedia setelah simulasi disimpan.
      </p>
    </section>

    <section
      class="rounded-card border border-warning-200 bg-warning-50 p-5"
      aria-labelledby="judul-asumsi"
    >
      <div class="flex flex-wrap items-center gap-2">
        <h2 id="judul-asumsi" class="text-base font-semibold text-warning-700">
          Asumsi
        </h2>
        <StatusBadge label="Estimasi, bukan laba bersih" tone="warning" />
      </div>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-warning-700">
        <li>
          Harga normal dan biaya per unit adalah snapshot saat ini; harga dapat
          berubah dan membuat hasil perlu dihitung ulang.
        </li>
        <li>
          Diskon hanya valid jika kualitas, ukuran, dan kuantitas komponen paket
          sebanding dengan pembelian normal terpisah.
        </li>
        <li>
          Biaya item, kemasan tambahan, dan biaya penjualan variabel harus diisi
          tanpa tumpang tindih. Jangan memasukkan biaya yang sama dua kali.
        </li>
        <li>
          Laba paket adalah estimasi dan <strong>tidak termasuk</strong> biaya
          tetap seperti sewa, gaji pemilik, administrasi, pajak, bunga, dan
          biaya akuisisi pelanggan.
        </li>
        <li>
          Data simulasi disimpan di perangkat ini dan dapat diekspor sebagai
          backup. Data lokal dapat hilang jika penyimpanan situs dihapus.
        </li>
      </ul>
    </section>

    <ConfirmDialog
      v-model:open="resetOpen"
      title="Reset form?"
      message="Semua isian yang belum disimpan akan dikosongkan. Simulasi yang sudah tersimpan tidak dihapus."
      confirm-label="Reset form"
      tone="danger"
      @confirm="resetForm"
    />
  </div>
</template>
