<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import InputQty from '@/components/InputQty.vue'
import InputRupiah from '@/components/InputRupiah.vue'
import InputSelectSatuan from '@/components/InputSelectSatuan.vue'
import ResultCard from '@/components/ResultCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatPercent, formatRupiah } from '@/lib/calc/currency-format'
import {
  hargaPerSatuanStandarDetail,
  penghematan,
  persenAnggaranTerpakai,
  sisaAnggaran,
  statusAnggaran,
  totalBelanja,
  type HargaSatuanStandarDetail,
  type StatusAnggaran,
} from '@/lib/calc/household'
import type { Result } from '@/lib/calc/result'
import type { Satuan } from '@/lib/calc/unit-conversion'
import { fileDateStamp } from '@/lib/format-date'
import { simulationsToCsv } from '@/lib/storage/csv'
import { downloadCsv } from '@/lib/storage/download'
import { errorMessage } from '@/lib/storage/errors'
import { getSimulationById } from '@/lib/storage/repository'
import {
  SCHEMA_VERSION,
  householdPayloadSchema,
  type HouseholdPayload,
  type SimulationRecord,
} from '@/lib/storage/schemas'
import { useSimulationStore } from '@/stores/simulations'
import { useToastStore } from '@/stores/toast'

interface ItemForm {
  rowId: string
  nama: string
  kuantitas: number | null
  satuan: Satuan
  harga: number | null
}

interface UnitCheckForm {
  nama: string
  hargaKemasan: number | null
  isiKemasan: number | null
  satuan: Satuan
}

interface HouseholdForm {
  budget: number | null
  items: ItemForm[]
  baselineItems: ItemForm[]
  alternativeItems: ItemForm[]
  notes: string
  unitPriceCheck: UnitCheckForm
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

type ListTab = 'items' | 'baseline' | 'alternative'
type ListKey = 'items' | 'baselineItems' | 'alternativeItems'

interface ListConfig {
  key: ListKey
  title: string
  description: string
  itemLabel: string
  addLabel: string
}

const LIST_CONFIG: Record<ListTab, ListConfig> = {
  items: {
    key: 'items',
    title: 'Daftar belanja utama',
    description:
      'Masukkan nama barang, kuantitas, satuan, dan harga per satuan yang akan dibeli.',
    itemLabel: 'Barang',
    addLabel: 'Tambah barang',
  },
  baseline: {
    key: 'baselineItems',
    title: 'Daftar baseline',
    description:
      'Harga atau pilihan belanja yang biasa dipakai sebagai pembanding. Daftar ini opsional.',
    itemLabel: 'Barang baseline',
    addLabel: 'Tambah barang baseline',
  },
  alternative: {
    key: 'alternativeItems',
    title: 'Daftar alternatif',
    description:
      'Harga atau pilihan belanja alternatif yang ingin dibandingkan dengan baseline. Daftar ini opsional.',
    itemLabel: 'Barang alternatif',
    addLabel: 'Tambah barang alternatif',
  },
}

const TABS: readonly { id: ListTab; label: string }[] = [
  { id: 'items', label: 'Daftar belanja' },
  { id: 'baseline', label: 'Baseline' },
  { id: 'alternative', label: 'Alternatif' },
]

const route = useRoute()
const router = useRouter()
const simulationStore = useSimulationStore()
const toastStore = useToastStore()

const currentSimulationId = ref<string | null>(null)
const loadingSaved = ref(false)
const saving = ref(false)
const showIssues = ref(false)
const resetOpen = ref(false)
const formElement = ref<HTMLFormElement | null>(null)
const activeList = ref<ListTab>('items')

function newItem(
  nama = '',
  kuantitas: number | null = null,
  satuan: Satuan = 'pcs',
  harga: number | null = null,
): ItemForm {
  return {
    rowId: crypto.randomUUID(),
    nama,
    kuantitas,
    satuan,
    harga,
  }
}

function newUnitCheck(): UnitCheckForm {
  return {
    nama: '',
    hargaKemasan: null,
    isiKemasan: null,
    satuan: 'kg',
  }
}

function blankForm(): HouseholdForm {
  return {
    budget: null,
    items: [newItem()],
    baselineItems: [],
    alternativeItems: [],
    notes: '',
    unitPriceCheck: newUnitCheck(),
  }
}

const form = reactive<HouseholdForm>(blankForm())

function isRowActive(row: ItemForm): boolean {
  return (
    row.nama.trim() !== '' || row.kuantitas !== null || row.harga !== null
  )
}

function activeRowsFor(key: ListKey): ItemForm[] {
  return form[key].filter(isRowActive)
}

const activeConfig = computed(() => LIST_CONFIG[activeList.value])
const activeRows = computed(() => form[activeConfig.value.key])

const mainActive = computed(() => activeRowsFor('items'))
const baselineActive = computed(() => activeRowsFor('baselineItems'))
const alternativeActive = computed(() => activeRowsFor('alternativeItems'))

function calculationItems(rows: readonly ItemForm[]) {
  return rows.map((row) => ({
    jumlah: row.kuantitas ?? Number.NaN,
    hargaSatuan: row.harga ?? Number.NaN,
  }))
}

const totalResult = computed(() => totalBelanja(calculationItems(mainActive.value)))
const baselineResult = computed(() =>
  totalBelanja(calculationItems(baselineActive.value)),
)
const alternativeResult = computed(() =>
  totalBelanja(calculationItems(alternativeActive.value)),
)

const total = computed(() =>
  totalResult.value.ok ? totalResult.value.value : null,
)
const baselineTotal = computed(() =>
  baselineActive.value.length === 0
    ? null
    : baselineResult.value.ok
      ? baselineResult.value.value
      : null,
)
const alternativeTotal = computed(() =>
  alternativeActive.value.length === 0
    ? null
    : alternativeResult.value.ok
      ? alternativeResult.value.value
      : null,
)

const sisaResult = computed(() => {
  if (form.budget === null || total.value === null) return null
  return sisaAnggaran(form.budget, total.value)
})

const persenResult = computed(() => {
  if (form.budget === null || total.value === null) return null
  return persenAnggaranTerpakai(form.budget, total.value)
})

const statusResult = computed(() => {
  if (form.budget === null || total.value === null) return null
  return statusAnggaran(form.budget, total.value)
})

const savingsResult = computed(() => {
  if (baselineTotal.value === null || alternativeTotal.value === null) {
    return null
  }
  return penghematan(baselineTotal.value, alternativeTotal.value)
})

const unitCheckActive = computed(
  () =>
    form.unitPriceCheck.nama.trim() !== '' ||
    form.unitPriceCheck.hargaKemasan !== null ||
    form.unitPriceCheck.isiKemasan !== null,
)

const unitCheckComplete = computed(
  () =>
    form.unitPriceCheck.hargaKemasan !== null &&
    form.unitPriceCheck.isiKemasan !== null,
)

const unitCheckResult = computed(() => {
  if (
    !unitCheckActive.value ||
    !unitCheckComplete.value ||
    form.unitPriceCheck.hargaKemasan === null ||
    form.unitPriceCheck.isiKemasan === null
  ) {
    return null
  }

  return hargaPerSatuanStandarDetail(
    form.unitPriceCheck.hargaKemasan,
    form.unitPriceCheck.isiKemasan,
    form.unitPriceCheck.satuan,
  )
})

const sisa = computed(() =>
  sisaResult.value?.ok ? sisaResult.value.value : null,
)
const persen = computed(() =>
  persenResult.value?.ok ? persenResult.value.value : null,
)
const status = computed<StatusAnggaran | null>(() =>
  statusResult.value?.ok ? statusResult.value.value : null,
)
const savings = computed(() =>
  savingsResult.value?.ok ? savingsResult.value.value : null,
)
const unitCheck = computed<HargaSatuanStandarDetail | null>(() =>
  unitCheckResult.value?.ok ? unitCheckResult.value.value : null,
)

function activeCount(tab: ListTab): number {
  return activeRowsFor(LIST_CONFIG[tab].key).length
}

const statusView = computed<StatusView>(() => {
  if (
    form.budget === null ||
    total.value === null ||
    status.value === null
  ) {
    return {
      tone: 'neutral',
      label: 'Belum dinilai',
      description:
        'Isi anggaran dan minimal satu barang untuk melihat status belanja.',
    }
  }

  const sisaValue = sisa.value ?? 0
  const persenValue = persen.value

  if (status.value === 'melebihi_anggaran') {
    return {
      tone: 'danger',
      label: 'Melebihi anggaran',
      description: `Total belanja ${formatRupiah(total.value)} melebihi anggaran ${formatRupiah(form.budget)} sebesar ${formatRupiah(Math.abs(sisaValue))}.`,
    }
  }

  if (status.value === 'mendekati_batas') {
    const pemakaian =
      persenValue === null ? '' : ` (${formatPercent(persenValue)} terpakai)`
    return {
      tone: 'warning',
      label: 'Mendekati batas',
      description: `Sisa anggaran ${formatRupiah(sisaValue)}${pemakaian}. Pertimbangkan menunda atau mengurangi pembelian yang tidak mendesak.`,
    }
  }

  return {
    tone: 'success',
    label: 'Dalam anggaran',
    description: `Total belanja ${formatRupiah(total.value)} masih menyisakan ${formatRupiah(sisaValue)} dari anggaran ${formatRupiah(form.budget)}.`,
  }
})

const rekomendasi = computed<string[]>(() => {
  const recommendations: string[] = []

  if (form.budget === null) {
    recommendations.push(
      'Isi anggaran belanja agar sisa dan persentase pemakaian dapat dihitung.',
    )
  }

  if (mainActive.value.length === 0) {
    recommendations.push(
      'Tambahkan minimal satu barang pada daftar belanja utama.',
    )
  }

  if (
    mainActive.value.length > 0 &&
    (baselineActive.value.length === 0 || alternativeActive.value.length === 0)
  ) {
    recommendations.push(
      'Isi daftar baseline dan alternatif untuk menghitung penghematan dari perbandingan harga.',
    )
  }

  if (status.value === 'melebihi_anggaran' && sisa.value !== null) {
    recommendations.push(
      `Kurangi belanja sebesar ${formatRupiah(Math.abs(sisa.value))} atau tambah anggaran agar total kembali sesuai batas.`,
    )
  } else if (status.value === 'mendekati_batas' && sisa.value !== null) {
    recommendations.push(
      `Sisa anggaran hanya ${formatRupiah(sisa.value)}. Dahulukan kebutuhan pokok dan tunda pembelian yang tidak mendesak.`,
    )
  } else if (status.value === 'dalam_anggaran' && sisa.value !== null) {
    recommendations.push(
      `Belanja masih dalam anggaran dengan sisa ${formatRupiah(sisa.value)}.`,
    )
  }

  if (
    form.budget === 0 &&
    total.value !== null &&
    persen.value === null
  ) {
    recommendations.push(
      'Anggaran Rp0 membuat persentase anggaran terpakai tidak tersedia; isi anggaran jika ingin memantau proporsi belanja.',
    )
  }

  if (savings.value !== null) {
    if (savings.value > 0) {
      recommendations.push(
        `Alternatif lebih murah ${formatRupiah(savings.value)} dibanding baseline, dengan catatan kualitas, kuantitas, dan satuannya sebanding.`,
      )
    } else if (savings.value < 0) {
      recommendations.push(
        `Alternatif lebih mahal ${formatRupiah(Math.abs(savings.value))} dibanding baseline. Periksa kembali apakah selisihnya sepadan dengan kualitas yang didapat.`,
      )
    } else {
      recommendations.push(
        'Total baseline dan alternatif sama. Tidak ada penghematan nominal dari perbandingan ini.',
      )
    }
  }

  if (unitCheck.value) {
    recommendations.push(
      `Harga kemasan setara ${formatRupiah(unitCheck.value.harga)} per ${unitCheck.value.satuan}. Gunakan angka ini hanya untuk membandingkan kemasan dengan satuan yang sejenis.`,
    )
  }

  if (
    baselineActive.value.length > 0 &&
    alternativeActive.value.length > 0
  ) {
    recommendations.push(
      'Penghematan hanya sah jika kualitas, kuantitas, satuan, dan kebutuhan yang dibandingkan sama. Jangan membandingkan gram dengan mililiter tanpa informasi densitas.',
    )
  }

  return recommendations
})

const formIssues = computed<FormIssue[]>(() => {
  const issues: FormIssue[] = []

  if (
    form.budget === null ||
    !Number.isFinite(form.budget) ||
    form.budget < 0 ||
    !Number.isInteger(form.budget)
  ) {
    issues.push({
      field: 'budget',
      message: 'Anggaran belanja wajib diisi dalam Rupiah bulat.',
    })
  }

  if (mainActive.value.length === 0) {
    issues.push({
      field: 'items',
      message: 'Tambahkan minimal satu barang pada daftar belanja utama.',
    })
  }

  const lists: { key: ListKey; label: string }[] = [
    { key: 'items', label: 'Daftar belanja utama' },
    { key: 'baselineItems', label: 'Daftar baseline' },
    { key: 'alternativeItems', label: 'Daftar alternatif' },
  ]

  lists.forEach((list) => {
    activeRowsFor(list.key).forEach((row) => {
      if (row.nama.trim() === '') {
        issues.push({
          field: `${list.key}.${row.rowId}.nama`,
          message: `Nama barang pada ${list.label.toLowerCase()} wajib diisi.`,
        })
      }
      if (
        row.kuantitas === null ||
        !Number.isFinite(row.kuantitas) ||
        row.kuantitas <= 0
      ) {
        issues.push({
          field: `${list.key}.${row.rowId}.kuantitas`,
          message: `Kuantitas pada ${list.label.toLowerCase()} harus lebih besar dari 0.`,
        })
      }
      if (
        row.harga === null ||
        !Number.isFinite(row.harga) ||
        row.harga < 0 ||
        !Number.isInteger(row.harga)
      ) {
        issues.push({
          field: `${list.key}.${row.rowId}.harga`,
          message: `Harga per satuan pada ${list.label.toLowerCase()} wajib diisi dalam Rupiah bulat.`,
        })
      }
    })
  })

  if (unitCheckActive.value) {
    if (!unitCheckComplete.value) {
      issues.push({
        field: 'unitPriceCheck',
        message:
          'Lengkapi harga kemasan dan isi kemasan, atau kosongkan cek harga satuan.',
      })
    }
    if (
      form.unitPriceCheck.hargaKemasan !== null &&
      (!Number.isFinite(form.unitPriceCheck.hargaKemasan) ||
        form.unitPriceCheck.hargaKemasan < 0 ||
        !Number.isInteger(form.unitPriceCheck.hargaKemasan))
    ) {
      issues.push({
        field: 'unitPriceCheck.hargaKemasan',
        message: 'Harga kemasan wajib diisi dalam Rupiah bulat.',
      })
    }
    if (
      form.unitPriceCheck.isiKemasan !== null &&
      (!Number.isFinite(form.unitPriceCheck.isiKemasan) ||
        form.unitPriceCheck.isiKemasan <= 0)
    ) {
      issues.push({
        field: 'unitPriceCheck.isiKemasan',
        message: 'Isi kemasan harus lebih besar dari 0.',
      })
    }
  }

  return issues
})

const calculationErrors = computed(() => {
  const results: (Result<unknown> | null)[] = [
    totalResult.value,
    baselineResult.value,
    alternativeResult.value,
    sisaResult.value,
    persenResult.value,
    statusResult.value,
    savingsResult.value,
    unitCheckResult.value,
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

function specificRowIssue(
  rowId: string,
  field: 'nama' | 'kuantitas' | 'harga',
): string | null {
  return issueFor(`${activeConfig.value.key}.${rowId}.${field}`)
}

function numberFormat(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 4,
  }).format(value)
}

function rupiahOr(value: number | null): string {
  return value === null ? '—' : formatRupiah(value)
}

function persenOr(value: number | null): string {
  return value === null ? 'Tidak tersedia' : formatPercent(value)
}

function addRow(): void {
  form[activeConfig.value.key].push(newItem())
}

function removeRow(index: number): void {
  form[activeConfig.value.key].splice(index, 1)
}

function isiContoh(): void {
  const contohItems = [
    newItem('Beras', 5, 'kg', 12_000),
    newItem('Minyak', 2, 'l', 17_000),
    newItem('Telur', 1, 'kg', 30_000),
    newItem('Sabun', 2, 'pcs', 5_000),
  ]

  Object.assign(form, {
    budget: 200_000,
    items: contohItems,
    baselineItems: [
      newItem('Beras', 5, 'kg', 13_000),
      newItem('Minyak', 2, 'l', 18_000),
      newItem('Telur', 1, 'kg', 32_000),
      newItem('Sabun', 2, 'pcs', 5_000),
    ],
    alternativeItems: contohItems.map((item) =>
      newItem(item.nama, item.kuantitas, item.satuan, item.harga),
    ),
    notes: 'Contoh belanja mingguan rumah tangga.',
    unitPriceCheck: {
      nama: 'Beras kemasan',
      hargaKemasan: 18_000,
      isiKemasan: 750,
      satuan: 'g',
    },
  })

  activeList.value = 'items'
  currentSimulationId.value = null
  showIssues.value = false
  if (route.query.simulation) {
    void router.replace({ path: route.path, query: {} })
  }
}

function applyPayload(payload: HouseholdPayload): void {
  Object.assign(form, {
    budget: payload.budget,
    items:
      payload.items.length > 0
        ? payload.items.map((item) =>
            newItem(item.nama, item.kuantitas, item.satuan, item.harga),
          )
        : [newItem()],
    baselineItems: payload.baselineItems.map((item) =>
      newItem(item.nama, item.kuantitas, item.satuan, item.harga),
    ),
    alternativeItems: payload.alternativeItems.map((item) =>
      newItem(item.nama, item.kuantitas, item.satuan, item.harga),
    ),
    notes: payload.notes,
    unitPriceCheck: payload.unitPriceCheck
      ? {
          nama: payload.unitPriceCheck.nama ?? '',
          hargaKemasan: payload.unitPriceCheck.hargaKemasan,
          isiKemasan: payload.unitPriceCheck.isiKemasan,
          satuan: payload.unitPriceCheck.satuan,
        }
      : newUnitCheck(),
  })

  activeList.value = 'items'
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

  if (result.value.moduleType !== 'household') {
    toastStore.error('Simulasi ini bukan simulasi Hemat Rumah Tangga.')
    return
  }

  const parsed = householdPayloadSchema.safeParse(result.value.payload)
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

function buildPayload(): HouseholdPayload | null {
  if (
    form.budget === null ||
    !Number.isFinite(form.budget) ||
    form.budget < 0 ||
    !Number.isInteger(form.budget)
  ) {
    return null
  }

  if (mainActive.value.length === 0) return null

  const items = mainActive.value.map((row) => ({
    nama: row.nama.trim(),
    kuantitas: row.kuantitas ?? 0,
    satuan: row.satuan,
    harga: row.harga ?? 0,
  }))

  const baselineItems = baselineActive.value.map((row) => ({
    nama: row.nama.trim(),
    kuantitas: row.kuantitas ?? 0,
    satuan: row.satuan,
    harga: row.harga ?? 0,
  }))

  const alternativeItems = alternativeActive.value.map((row) => ({
    nama: row.nama.trim(),
    kuantitas: row.kuantitas ?? 0,
    satuan: row.satuan,
    harga: row.harga ?? 0,
  }))

  const payload: HouseholdPayload = {
    budget: form.budget,
    items,
    baselineItems,
    alternativeItems,
    notes: form.notes,
  }

  if (
    unitCheckComplete.value &&
    form.unitPriceCheck.hargaKemasan !== null &&
    form.unitPriceCheck.isiKemasan !== null
  ) {
    const nama = form.unitPriceCheck.nama.trim()
    payload.unitPriceCheck = {
      ...(nama !== '' ? { nama } : {}),
      hargaKemasan: form.unitPriceCheck.hargaKemasan,
      isiKemasan: form.unitPriceCheck.isiKemasan,
      satuan: form.unitPriceCheck.satuan,
    }
  }

  return payload
}

function simulationName(payload: HouseholdPayload): string {
  const notes = payload.notes.trim()
  const firstItem = payload.items[0]?.nama
  const fallback =
    firstItem === undefined
      ? 'Belanja rumah tangga'
      : `Belanja ${firstItem}`
  return (notes !== '' ? notes : fallback).slice(0, 120)
}

function hasBlockingErrors(): boolean {
  return (
    formIssues.value.length > 0 ||
    calculationErrors.value.length > 0 ||
    hasVisibleInputError()
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
        name: simulationName(payload),
        payload,
      })
    : await simulationStore.create({
        moduleType: 'household',
        name: simulationName(payload),
        payload,
      })

  saving.value = false

  if (!result.ok) {
    toastStore.error(errorMessage(result.errors))
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
    toastStore.error(errorMessage(result.errors))
    return
  }

  currentSimulationId.value = result.value.id
  const parsed = householdPayloadSchema.safeParse(result.value.payload)
  if (parsed.success) applyPayload(parsed.data)
  await router.replace({
    path: route.path,
    query: { simulation: result.value.id },
  })
  toastStore.success('Simulasi diduplikasi. Anda sedang membuka salinannya.')
}

function resetForm(): void {
  Object.assign(form, blankForm())
  activeList.value = 'items'
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
    moduleType: 'household',
    name: simulationName(payload),
    payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: SCHEMA_VERSION,
  }

  const csv = simulationsToCsv('household', [record])
  downloadCsv(`hematpintar-rumah-tangga-${fileDateStamp()}.csv`, csv)
  toastStore.success('CSV simulasi Hemat Rumah Tangga berhasil diunduh.')
}
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-medium text-primary-700">Hemat Rumah Tangga</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Susun belanja rumah tangga yang masih dalam anggaran
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Masukkan anggaran dan daftar belanja. Total, sisa anggaran, status,
          dan penghematan dihitung langsung saat input berubah.
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
      <section class="card p-5" aria-labelledby="judul-anggaran">
        <h2 id="judul-anggaran" class="text-base font-semibold text-slate-900">
          Anggaran dan kebutuhan
        </h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <InputRupiah
            v-model="form.budget"
            label="Anggaran belanja"
            hint="Batas belanja untuk periode ini."
            required
            :error="issueFor('budget')"
          />
          <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            <p class="font-medium text-slate-700">Cara menghitung</p>
            <p class="mt-1">
              Total belanja = jumlah kuantitas × harga per satuan. Sisa
              anggaran = anggaran − total belanja.
            </p>
          </div>
        </div>
      </section>

      <section class="card p-5" aria-labelledby="judul-daftar">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="judul-daftar" class="text-base font-semibold text-slate-900">
              Daftar belanja
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              Gunakan tab untuk berpindah antara belanja utama, baseline, dan
              alternatif.
            </p>
          </div>
          <button type="button" class="btn btn-secondary" @click="addRow">
            {{ activeConfig.addLabel }}
          </button>
        </div>

        <div
          class="mt-4 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Jenis daftar belanja"
        >
          <button
            v-for="tab in TABS"
            :key="tab.id"
            type="button"
            role="tab"
            :aria-selected="activeList === tab.id"
            :class="[
              'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
              activeList === tab.id
                ? 'border-primary-600 bg-primary-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
            ]"
            @click="activeList = tab.id"
          >
            {{ tab.label }}
            <span
              class="ml-1 rounded-full px-1.5 py-0.5 text-xs"
              :class="
                activeList === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              "
            >
              {{ activeCount(tab.id) }}
            </span>
          </button>
        </div>

        <div
          :id="`panel-${activeList}`"
          class="mt-4"
          role="tabpanel"
          :aria-label="activeConfig.title"
        >
          <h3 class="text-sm font-semibold text-slate-800">
            {{ activeConfig.title }}
          </h3>
          <p class="mt-1 text-sm text-slate-600">
            {{ activeConfig.description }}
          </p>

          <p
            v-if="issueFor(activeConfig.key)"
            class="mt-3 text-sm text-error-600"
            role="alert"
          >
            {{ issueFor(activeConfig.key) }}
          </p>

          <div class="mt-4 space-y-4">
            <fieldset
              v-for="(row, index) in activeRows"
              :key="row.rowId"
              class="rounded-lg border border-slate-200 p-4"
            >
              <legend class="px-1 text-sm font-semibold text-slate-700">
                {{ activeConfig.itemLabel }} {{ index + 1 }}
              </legend>

              <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label :for="`barang-nama-${row.rowId}`" class="label-base">
                    Nama barang
                    <span class="text-error-600" aria-hidden="true">*</span>
                  </label>
                  <input
                    :id="`barang-nama-${row.rowId}`"
                    v-model="row.nama"
                    type="text"
                    class="input-base"
                    autocomplete="off"
                    maxlength="120"
                    :aria-invalid="
                      specificRowIssue(row.rowId, 'nama') ? 'true' : undefined
                    "
                  />
                  <p
                    v-if="specificRowIssue(row.rowId, 'nama')"
                    class="mt-1.5 text-sm text-error-600"
                    role="alert"
                  >
                    {{ specificRowIssue(row.rowId, 'nama') }}
                  </p>
                </div>

                <InputQty
                  v-model="row.kuantitas"
                  label="Kuantitas"
                  hint="Jumlah yang dibeli, bukan harga paket."
                  :min="0"
                  :step="0.01"
                  positive
                  required
                  :error="specificRowIssue(row.rowId, 'kuantitas')"
                />

                <InputSelectSatuan v-model="row.satuan" label="Satuan" />

                <InputRupiah
                  v-model="row.harga"
                  label="Harga per satuan"
                  hint="Harga untuk 1 satuan yang dipilih."
                  required
                  :error="specificRowIssue(row.rowId, 'harga')"
                />
              </div>

              <div class="mt-3 flex justify-end">
                <button
                  type="button"
                  class="btn btn-ghost text-error-700 hover:bg-error-50"
                  :aria-label="`Hapus ${activeConfig.itemLabel.toLowerCase()} ${index + 1}`"
                  @click="removeRow(index)"
                >
                  Hapus barang
                </button>
              </div>
            </fieldset>
          </div>

          <p v-if="activeRows.length === 0" class="mt-4 text-sm text-slate-600">
            Belum ada baris pada daftar ini. Klik
            <strong>{{ activeConfig.addLabel }}</strong> untuk menambahkan.
          </p>
        </div>
      </section>

      <section class="card p-5" aria-labelledby="judul-catatan">
        <h2 id="judul-catatan" class="text-base font-semibold text-slate-900">
          Catatan dan cek harga satuan
        </h2>

        <div class="mt-4 grid gap-4">
          <div>
            <label for="household-catatan" class="label-base">
              Catatan (opsional)
            </label>
            <textarea
              id="household-catatan"
              v-model="form.notes"
              class="input-base min-h-24"
              maxlength="1000"
              placeholder="Contoh: belanja mingguan, kebutuhan bulan ini, atau toko pembanding."
            />
          </div>

          <div class="rounded-lg border border-slate-200 p-4">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-sm font-semibold text-slate-800">
                Cek harga per satuan standar
              </h3>
              <StatusBadge label="Opsional" tone="neutral" />
            </div>
            <p class="mt-1 text-sm text-slate-600">
              Bandingkan kemasan dengan satuan standar. Contoh: Rp18.000 untuk
              750 g setara Rp24.000/kg.
            </p>

            <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label for="cek-nama-kemasan" class="label-base">
                  Nama kemasan (opsional)
                </label>
                <input
                  id="cek-nama-kemasan"
                  v-model="form.unitPriceCheck.nama"
                  type="text"
                  class="input-base"
                  autocomplete="off"
                  maxlength="120"
                />
              </div>

              <InputRupiah
                v-model="form.unitPriceCheck.hargaKemasan"
                label="Harga kemasan"
                hint="Harga total satu kemasan."
                :error="issueFor('unitPriceCheck.hargaKemasan')"
              />

              <InputQty
                v-model="form.unitPriceCheck.isiKemasan"
                label="Isi kemasan"
                hint="Berat, volume, atau jumlah isi."
                :min="0"
                :step="0.01"
                positive
                :error="issueFor('unitPriceCheck.isiKemasan')"
              />

              <InputSelectSatuan
                v-model="form.unitPriceCheck.satuan"
                label="Satuan isi kemasan"
              />
            </div>

            <p
              v-if="issueFor('unitPriceCheck')"
              class="mt-3 text-sm text-error-600"
              role="alert"
            >
              {{ issueFor('unitPriceCheck') }}
            </p>
          </div>
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

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard
          data-testid="total-belanja"
          title="Total belanja"
          :value="rupiahOr(total)"
          tone="primary"
          description="Jumlah kuantitas × harga per satuan dari daftar belanja utama."
        />
        <ResultCard
          data-testid="sisa-anggaran"
          title="Sisa / kelebihan anggaran"
          :value="
            sisa === null
              ? '—'
              : sisa >= 0
                ? formatRupiah(sisa)
                : `Kelebihan ${formatRupiah(Math.abs(sisa))}`
          "
          :tone="
            sisa === null
              ? 'neutral'
              : sisa < 0
                ? 'danger'
                : status === 'mendekati_batas'
                  ? 'warning'
                  : 'success'
          "
          description="Anggaran − total belanja. Nilai negatif ditampilkan sebagai kelebihan."
        />
        <ResultCard
          data-testid="persen-anggaran"
          title="Persentase anggaran terpakai"
          :value="form.budget === null ? '—' : persenOr(persen)"
          :tone="
            status === 'melebihi_anggaran'
              ? 'danger'
              : status === 'mendekati_batas'
                ? 'warning'
                : 'neutral'
          "
          description="Total belanja ÷ anggaran. Tidak tersedia bila anggaran Rp0."
        />
        <ResultCard
          data-testid="status-anggaran"
          title="Status anggaran"
          :value="statusView.label"
          :tone="statusView.tone"
          :description="statusView.description"
        />
        <ResultCard
          data-testid="baseline-total"
          title="Total baseline"
          :value="rupiahOr(baselineTotal)"
          tone="neutral"
          description="Total harga pada daftar baseline."
        />
        <ResultCard
          data-testid="alternatif-total"
          title="Total alternatif"
          :value="rupiahOr(alternativeTotal)"
          tone="neutral"
          description="Total harga pada daftar alternatif."
        />
        <ResultCard
          data-testid="penghematan"
          title="Penghematan"
          :value="rupiahOr(savings)"
          :tone="
            savings === null
              ? 'neutral'
              : savings > 0
                ? 'success'
                : savings < 0
                  ? 'danger'
                  : 'neutral'
          "
          description="Baseline − alternatif. Positif berarti alternatif lebih murah."
        />
        <ResultCard
          data-testid="harga-satuan"
          title="Harga per satuan standar"
          :value="
            unitCheck === null
              ? 'Tidak tersedia'
              : `${formatRupiah(unitCheck.harga)}/${unitCheck.satuan}`
          "
          tone="neutral"
          :description="
            unitCheck === null
              ? 'Lengkapi cek harga kemasan untuk melihat harga per kg, l, atau pcs.'
              : `${formatRupiah(form.unitPriceCheck.hargaKemasan ?? 0)} ÷ ${numberFormat(unitCheck.isiStandar)} ${unitCheck.satuan} = ${formatRupiah(unitCheck.harga)}/${unitCheck.satuan}.`
          "
        />
      </div>
    </section>

    <section class="card p-5" aria-labelledby="judul-rincian">
      <h2 id="judul-rincian" class="text-base font-semibold text-slate-900">
        Rincian perhitungan
      </h2>
      <dl class="mt-4 divide-y divide-slate-100 text-sm">
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Anggaran</dt>
          <dd class="font-medium text-slate-900">
            {{ form.budget === null ? '—' : formatRupiah(form.budget) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Total belanja utama</dt>
          <dd class="font-semibold text-slate-900">{{ rupiahOr(total) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Sisa / kelebihan anggaran</dt>
          <dd class="font-medium text-slate-900">
            {{
              sisa === null
                ? '—'
                : sisa >= 0
                  ? formatRupiah(sisa)
                  : `Kelebihan ${formatRupiah(Math.abs(sisa))}`
            }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Persentase anggaran terpakai</dt>
          <dd class="font-medium text-slate-900">
            {{ form.budget === null ? '—' : persenOr(persen) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Total baseline</dt>
          <dd class="font-medium text-slate-900">{{ rupiahOr(baselineTotal) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Total alternatif</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(alternativeTotal) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Penghematan (baseline − alternatif)</dt>
          <dd class="font-medium text-slate-900">{{ rupiahOr(savings) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Harga per satuan standar</dt>
          <dd class="font-medium text-slate-900">
            {{
              unitCheck === null
                ? 'Tidak tersedia'
                : `${formatRupiah(unitCheck.harga)}/${unitCheck.satuan}`
            }}
          </dd>
        </div>
      </dl>
      <p class="mt-3 text-xs leading-relaxed text-slate-500">
        Total = Σ (kuantitas × harga per satuan). Sisa = anggaran − total.
        Persentase = total ÷ anggaran (tidak dihitung bila anggaran Rp0).
        Penghematan = total baseline − total alternatif.
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
        <StatusBadge label="Perkiraan, bukan tagihan final" tone="warning" />
      </div>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-warning-700">
        <li>
          Harga yang dimasukkan adalah harga per satuan, bukan total per paket.
          Jika hanya mengetahui harga paket, isi kuantitas sesuai isi paket atau
          gunakan cek harga per satuan standar.
        </li>
        <li>
          Total belanja <strong>belum termasuk</strong> ongkos kirim, pajak,
          biaya administrasi, dan biaya lain di luar harga barang.
        </li>
        <li>
          Perbandingan baseline dan alternatif hanya sah jika kualitas,
          kuantitas, satuan, dan kebutuhan yang dibandingkan sama.
        </li>
        <li>
          Satuan yang berbeda dimensi, misalnya gram dan mililiter, tidak boleh
          dibandingkan langsung tanpa informasi densitas.
        </li>
        <li>
          Persentase anggaran tidak dihitung jika anggaran Rp0. Status
          “mendekati batas” berlaku mulai 90% anggaran terpakai.
        </li>
        <li>
          Data simulasi disimpan di perangkat ini dan dapat diekspor sebagai
          backup.
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
