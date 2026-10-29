<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import InputPersen from '@/components/InputPersen.vue'
import InputQty from '@/components/InputQty.vue'
import InputRupiah from '@/components/InputRupiah.vue'
import InputSelectSatuan from '@/components/InputSelectSatuan.vue'
import ResultCard from '@/components/ResultCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatPercent, formatRupiah } from '@/lib/calc/currency-format'
import {
  biayaBahanBatch,
  breakEvenUnit,
  evaluasiMargin,
  hargaJualDariMargin,
  hppPerUnit,
  labaKontribusi,
  marginAktual,
  markup,
  simulasiBahanLengkap,
  totalBiayaBatch,
  totalBiayaLain,
  type Bahan,
} from '@/lib/calc/margin'
import type { Result } from '@/lib/calc/result'
import type { Satuan } from '@/lib/calc/unit-conversion'
import { fileDateStamp } from '@/lib/format-date'
import { simulationsToCsv } from '@/lib/storage/csv'
import { downloadCsv } from '@/lib/storage/download'
import { errorMessage } from '@/lib/storage/errors'
import { getSimulationById } from '@/lib/storage/repository'
import {
  SCHEMA_VERSION,
  marginPayloadSchema,
  type MarginPayload,
  type SimulationRecord,
} from '@/lib/storage/schemas'
import { useSimulationFeedback } from '@/composables/useSimulationFeedback'
import { useSimulationStore } from '@/stores/simulations'
import { useToastStore } from '@/stores/toast'

interface BahanForm {
  rowId: string
  nama: string
  jumlah: number | null
  satuan: Satuan
  hargaPerSatuan: number | null
}

interface MarginForm {
  productName: string
  batchYield: number | null
  ingredients: BahanForm[]
  packagingCost: number | null
  directLaborCost: number | null
  allocatedOverhead: number | null
  targetMargin: number | null
  currentPrice: number | null
  fixedCost: number | null
  materialChange: number | null
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

function newIngredient(
  nama = '',
  jumlah: number | null = null,
  satuan: Satuan = 'kg',
  hargaPerSatuan: number | null = null,
): BahanForm {
  return {
    rowId: crypto.randomUUID(),
    nama,
    jumlah,
    satuan,
    hargaPerSatuan,
  }
}

function blankForm(): MarginForm {
  return {
    productName: '',
    batchYield: null,
    ingredients: [newIngredient()],
    packagingCost: 0,
    directLaborCost: 0,
    allocatedOverhead: 0,
    targetMargin: null,
    currentPrice: null,
    fixedCost: 0,
    materialChange: 0,
  }
}

const form = reactive<MarginForm>(blankForm())

const activeIngredients = computed(() =>
  form.ingredients.filter(
    (row) =>
      row.nama.trim() !== '' ||
      row.jumlah !== null ||
      row.hargaPerSatuan !== null,
  ),
)

const bahanUntukHitung = computed<Bahan[]>(() =>
  activeIngredients.value.map((row) => ({
    jumlah: row.jumlah ?? Number.NaN,
    biayaPerSatuan: row.hargaPerSatuan ?? Number.NaN,
  })),
)

const biayaKemasan = computed(() => form.packagingCost ?? 0)
const biayaTenagaKerja = computed(() => form.directLaborCost ?? 0)
const overheadTeralokasi = computed(() => form.allocatedOverhead ?? 0)
const biayaTetap = computed(() => form.fixedCost ?? 0)
const perubahanBahan = computed(() => form.materialChange ?? 0)

const biayaBahanResult = computed(() =>
  biayaBahanBatch(bahanUntukHitung.value),
)
const biayaLainResult = computed(() =>
  totalBiayaLain(
    biayaKemasan.value,
    biayaTenagaKerja.value,
    overheadTeralokasi.value,
  ),
)
const totalBatchResult = computed(() =>
  totalBiayaBatch(
    bahanUntukHitung.value,
    biayaKemasan.value,
    biayaTenagaKerja.value,
    overheadTeralokasi.value,
  ),
)

const hppResult = computed(() => {
  if (!totalBatchResult.value.ok || form.batchYield === null) return null
  return hppPerUnit(totalBatchResult.value.value, form.batchYield)
})

const hargaMinimumResult = computed(() => {
  if (!hppResult.value?.ok || form.targetMargin === null) return null
  return hargaJualDariMargin(hppResult.value.value, form.targetMargin)
})

const hargaSaatIni = computed(() =>
  form.currentPrice !== null && form.currentPrice > 0
    ? form.currentPrice
    : null,
)

const marginResult = computed(() => {
  if (!hppResult.value?.ok || hargaSaatIni.value === null) return null
  return marginAktual(hargaSaatIni.value, hppResult.value.value)
})

const markupResult = computed(() => {
  if (!hppResult.value?.ok || hargaSaatIni.value === null) return null
  return markup(hargaSaatIni.value, hppResult.value.value)
})

const kontribusiResult = computed(() => {
  if (!hppResult.value?.ok || hargaSaatIni.value === null) return null
  return labaKontribusi(hargaSaatIni.value, hppResult.value.value)
})

const penilaianResult = computed(() => {
  if (
    !hppResult.value?.ok ||
    !hargaMinimumResult.value?.ok ||
    hargaSaatIni.value === null
  ) {
    return null
  }
  return evaluasiMargin(
    hargaSaatIni.value,
    hppResult.value.value,
    hargaMinimumResult.value.value,
  )
})

const breakEvenResult = computed(() => {
  if (!hppResult.value?.ok || hargaSaatIni.value === null) return null
  return breakEvenUnit(
    biayaTetap.value,
    hargaSaatIni.value,
    hppResult.value.value,
  )
})

const simulasiResult = computed(() => {
  if (
    !biayaBahanResult.value.ok ||
    !biayaLainResult.value.ok ||
    form.batchYield === null ||
    form.targetMargin === null
  ) {
    return null
  }

  return simulasiBahanLengkap({
    biayaBahan: biayaBahanResult.value.value,
    perubahanPersen: perubahanBahan.value,
    biayaLain: biayaLainResult.value.value,
    unitLayakJual: form.batchYield,
    targetMargin: form.targetMargin,
  })
})

const marginSimulasiResult = computed(() => {
  if (!simulasiResult.value?.ok || hargaSaatIni.value === null) return null
  return marginAktual(hargaSaatIni.value, simulasiResult.value.value.hppPerUnit)
})

const totalBatch = computed(() =>
  totalBatchResult.value.ok ? totalBatchResult.value.value : null,
)
const biayaBahan = computed(() =>
  biayaBahanResult.value.ok ? biayaBahanResult.value.value : null,
)
const biayaLain = computed(() =>
  biayaLainResult.value.ok ? biayaLainResult.value.value : null,
)
const hpp = computed(() =>
  hppResult.value?.ok ? hppResult.value.value : null,
)
const hargaMinimum = computed(() =>
  hargaMinimumResult.value?.ok ? hargaMinimumResult.value.value : null,
)
const marginAktualValue = computed(() =>
  marginResult.value?.ok ? marginResult.value.value : null,
)
const markupValue = computed(() =>
  markupResult.value?.ok ? markupResult.value.value : null,
)
const kontribusiValue = computed(() =>
  kontribusiResult.value?.ok ? kontribusiResult.value.value : null,
)
const penilaian = computed(() =>
  penilaianResult.value?.ok ? penilaianResult.value.value : null,
)
const breakEvenValue = computed(() =>
  breakEvenResult.value?.ok ? breakEvenResult.value.value : null,
)

const breakEvenError = computed(() => {
  if (!breakEvenResult.value || breakEvenResult.value.ok) return null
  return (
    breakEvenResult.value.errors[0]?.message ??
    'Break-even tidak dapat dihitung dengan asumsi saat ini.'
  )
})

const statusView = computed<StatusView>(() => {
  if (
    penilaian.value === null ||
    hargaSaatIni.value === null ||
    hpp.value === null ||
    hargaMinimum.value === null
  ) {
    return {
      tone: 'neutral',
      label: 'Belum dinilai',
      description:
        'Isi yield batch, target margin, dan harga jual saat ini untuk menilai status.',
    }
  }

  const status = penilaian.value.status

  if (status === 'rugi') {
    return {
      tone: 'danger',
      label: 'Rugi',
      description: `Harga jual ${formatRupiah(hargaSaatIni.value)} berada di bawah HPP ${formatRupiah(hpp.value)}. Setiap unit yang terjual belum menutup biaya produksi.`,
    }
  }

  if (status === 'di_bawah_target') {
    return {
      tone: 'warning',
      label: 'Di bawah target',
      description: `Harga jual ${formatRupiah(hargaSaatIni.value)} masih di bawah harga minimum ${formatRupiah(hargaMinimum.value)} sebesar ${formatRupiah(penilaian.value.selisihHargaMinimum)}.`,
    }
  }

  return {
    tone: 'success',
    label: 'Sehat',
    description: `Harga jual ${formatRupiah(hargaSaatIni.value)} sudah memenuhi target margin ${formatPercent(form.targetMargin ?? 0)}.`,
  }
})

const rekomendasi = computed<string[]>(() => {
  const recommendations: string[] = []
  const price = hargaSaatIni.value
  const hppValue = hpp.value
  const minimumValue = hargaMinimum.value
  const target = form.targetMargin

  if (price === null) {
    if (minimumValue !== null && target !== null) {
      recommendations.push(
        `Tentukan harga jual. Harga minimum untuk target margin ${formatPercent(target)} adalah ${formatRupiah(minimumValue)}.`,
      )
    } else {
      recommendations.push(
        'Isi yield batch dan target margin untuk menghitung harga jual minimum.',
      )
    }
  } else if (penilaian.value?.status === 'rugi' && hppValue !== null) {
    recommendations.push(
      `Harga jual saat ini ${formatRupiah(price)} berada di bawah HPP ${formatRupiah(hppValue)}. Naikkan harga atau turunkan biaya produksi.`,
    )
    if (minimumValue !== null && target !== null) {
      recommendations.push(
        `Harga minimum untuk target margin ${formatPercent(target)} adalah ${formatRupiah(minimumValue)}.`,
      )
    }
  } else if (penilaian.value?.status === 'di_bawah_target') {
    if (minimumValue !== null && target !== null) {
      recommendations.push(
        `Harga jual saat ini di bawah harga minimum sebesar ${formatRupiah(penilaian.value.selisihHargaMinimum)}.`,
      )
      recommendations.push(
        `Naikkan harga ke minimal ${formatRupiah(minimumValue)} untuk mencapai target ${formatPercent(target)}.`,
      )
    }
  } else if (penilaian.value?.status === 'sehat') {
    if (target !== null) {
      recommendations.push(
        `Harga jual sudah memenuhi target margin ${formatPercent(target)}.`,
      )
    }
    if (marginAktualValue.value !== null && markupValue.value !== null) {
      recommendations.push(
        `Margin aktual ${formatPercent(marginAktualValue.value)} dan markup ${formatPercent(markupValue.value)} memakai basis berbeda; jangan dibandingkan sebagai angka yang sama.`,
      )
    }
  }

  if (breakEvenResult.value && !breakEvenResult.value.ok) {
    recommendations.push(
      breakEvenResult.value.errors[0]?.message ??
        'Break-even tidak dapat dicapai dengan harga dan biaya saat ini.',
    )
  } else if (breakEvenValue.value !== null && biayaTetap.value === 0) {
    recommendations.push(
      'Biaya tetap periode 0 menghasilkan break-even 0 unit. Isi biaya tetap jika ada.',
    )
  }

  if (
    simulasiResult.value?.ok &&
    perubahanBahan.value !== 0 &&
    form.targetMargin !== null
  ) {
    recommendations.push(
      `Jika biaya bahan berubah ${formatPercent(perubahanBahan.value)}, HPP menjadi ${formatRupiah(simulasiResult.value.value.hppPerUnit)} dan harga minimum menjadi ${formatRupiah(simulasiResult.value.value.hargaJualMinimum)}.`,
    )
  }

  return recommendations
})

const formIssues = computed<FormIssue[]>(() => {
  const issues: FormIssue[] = []

  if (form.productName.trim() === '') {
    issues.push({
      field: 'productName',
      message: 'Nama produk wajib diisi.',
    })
  }

  if (
    form.batchYield === null ||
    !Number.isFinite(form.batchYield) ||
    form.batchYield <= 0
  ) {
    issues.push({
      field: 'batchYield',
      message: 'Yield batch harus lebih besar dari 0.',
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

  if (activeIngredients.value.length === 0) {
    issues.push({
      field: 'ingredients',
      message: 'Tambahkan minimal satu bahan.',
    })
  }

  activeIngredients.value.forEach((row) => {
    if (row.nama.trim() === '') {
      issues.push({
        field: `ingredients.${row.rowId}.nama`,
        message: 'Nama bahan wajib diisi.',
      })
    }
    if (
      row.jumlah === null ||
      !Number.isFinite(row.jumlah) ||
      row.jumlah <= 0
    ) {
      issues.push({
        field: `ingredients.${row.rowId}.jumlah`,
        message: 'Jumlah bahan harus lebih besar dari 0.',
      })
    }
    if (
      row.hargaPerSatuan === null ||
      !Number.isFinite(row.hargaPerSatuan) ||
      row.hargaPerSatuan < 0 ||
      !Number.isInteger(row.hargaPerSatuan)
    ) {
      issues.push({
        field: `ingredients.${row.rowId}.hargaPerSatuan`,
        message: 'Harga per satuan wajib diisi dalam Rupiah bulat.',
      })
    }
  })

  if (
    form.currentPrice !== null &&
    (!Number.isFinite(form.currentPrice) ||
      form.currentPrice < 0 ||
      !Number.isInteger(form.currentPrice))
  ) {
    issues.push({
      field: 'currentPrice',
      message: 'Harga jual saat ini harus Rupiah bulat atau dikosongkan.',
    })
  }

  if (form.materialChange !== null && form.materialChange < -1) {
    issues.push({
      field: 'materialChange',
      message: 'Penurunan harga bahan tidak boleh lebih dari 100%.',
    })
  }

  return issues
})

const calculationErrors = computed(() => {
  const results: (Result<unknown> | null)[] = [
    biayaBahanResult.value,
    biayaLainResult.value,
    totalBatchResult.value,
    hppResult.value,
    hargaMinimumResult.value,
    marginResult.value,
    markupResult.value,
    kontribusiResult.value,
    penilaianResult.value,
    breakEvenResult.value,
    simulasiResult.value,
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
  field: 'nama' | 'jumlah' | 'hargaPerSatuan',
): string | null {
  return issueFor(`ingredients.${rowId}.${field}`)
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

function addIngredient(): void {
  form.ingredients.push(newIngredient())
}

function removeIngredient(index: number): void {
  form.ingredients.splice(index, 1)
}

function isiContoh(): void {
  Object.assign(form, {
    productName: 'Ayam Goreng',
    batchYield: 10,
    ingredients: [
      newIngredient('Ayam', 1, 'kg', 24_000),
      newIngredient('Tepung', 0.5, 'kg', 12_000),
      newIngredient('Minyak', 0.25, 'l', 16_000),
    ],
    packagingCost: 3_000,
    directLaborCost: 2_000,
    allocatedOverhead: 1_000,
    targetMargin: 0.2,
    currentPrice: 5_000,
    fixedCost: 100_000,
    materialChange: 0,
  })
  currentSimulationId.value = null
  showIssues.value = false
  if (route.query.simulation) {
    void router.replace({ path: route.path, query: {} })
  }
}

function applyPayload(payload: MarginPayload): void {
  Object.assign(form, {
    productName: payload.productName,
    batchYield: payload.batchYield,
    ingredients:
      payload.ingredients.length > 0
        ? payload.ingredients.map((item) =>
            newIngredient(
              item.nama,
              item.kuantitas,
              item.satuan ?? 'pcs',
              item.hargaPerSatuan,
            ),
          )
        : [newIngredient()],
    packagingCost: payload.packagingCost,
    directLaborCost: payload.directLaborCost,
    allocatedOverhead: payload.allocatedOverhead,
    targetMargin: payload.targetMargin,
    currentPrice: payload.sellingPrice > 0 ? payload.sellingPrice : null,
    fixedCost: payload.biayaTetap ?? 0,
    materialChange: payload.perubahanHargaBahan ?? 0,
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

  if (result.value.moduleType !== 'margin') {
    toastStore.error('Simulasi ini bukan simulasi Margin Rescue.')
    return
  }

  const parsed = marginPayloadSchema.safeParse(result.value.payload)
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

function buildPayload(): MarginPayload | null {
  if (form.batchYield === null || form.targetMargin === null) return null
  const productName = form.productName.trim()
  if (productName === '') return null

  return {
    productName,
    batchYield: form.batchYield,
    ingredients: activeIngredients.value.map((row) => ({
      nama: row.nama.trim(),
      kuantitas: row.jumlah ?? 0,
      satuan: row.satuan,
      hargaPerSatuan: row.hargaPerSatuan ?? 0,
    })),
    packagingCost: form.packagingCost ?? 0,
    directLaborCost: form.directLaborCost ?? 0,
    allocatedOverhead: form.allocatedOverhead ?? 0,
    sellingPrice: form.currentPrice ?? 0,
    targetMargin: form.targetMargin,
    biayaTetap: form.fixedCost ?? 0,
    perubahanHargaBahan: form.materialChange ?? 0,
  }
}

async function save(): Promise<void> {
  showIssues.value = true
  if (formIssues.value.length > 0 || hasVisibleInputError()) {
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
        name: payload.productName,
        payload,
      })
    : await simulationStore.create({
        moduleType: 'margin',
        name: payload.productName,
        payload,
      })

  saving.value = false

  if (!result.ok) {
    reportSaveError(result, 'margin')
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
    reportSaveError(result, 'margin')
    return
  }

  currentSimulationId.value = result.value.id
  const parsed = marginPayloadSchema.safeParse(result.value.payload)
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
  if (formIssues.value.length > 0 || hasVisibleInputError()) {
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
    moduleType: 'margin',
    name: payload.productName,
    payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: SCHEMA_VERSION,
  }

  const csv = simulationsToCsv('margin', [record])
  downloadCsv(`hematpintar-margin-${fileDateStamp()}.csv`, csv)
  toastStore.success('CSV simulasi Margin Rescue berhasil diunduh.')
}
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-medium text-primary-700">Margin Rescue</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Hitung HPP dan harga jual yang sehat
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Masukkan biaya satu batch produksi. Hasil dihitung langsung saat
          input berubah, memakai mesin kalkulasi yang sama dengan pengujian.
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
      <section class="card p-5" aria-labelledby="judul-produk">
        <h2 id="judul-produk" class="text-base font-semibold text-slate-900">
          Produk dan batch
        </h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label for="margin-nama-produk" class="label-base">
              Nama produk
              <span class="text-error-600" aria-hidden="true">*</span>
            </label>
            <input
              id="margin-nama-produk"
              v-model="form.productName"
              type="text"
              class="input-base"
              maxlength="120"
              autocomplete="off"
              :aria-invalid="issueFor('productName') ? 'true' : undefined"
            />
            <p
              v-if="issueFor('productName')"
              class="mt-1.5 text-sm text-error-600"
              role="alert"
            >
              {{ issueFor('productName') }}
            </p>
          </div>

          <InputQty
            v-model="form.batchYield"
            label="Yield batch (unit layak jual)"
            hint="Jumlah unit yang benar-benar layak dijual dari satu batch."
            :min="0"
            :step="1"
            positive
            required
            :error="issueFor('batchYield')"
          />
        </div>
      </section>

      <section class="card p-5" aria-labelledby="judul-bahan">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="judul-bahan" class="text-base font-semibold text-slate-900">
              Bahan per batch
            </h2>
            <p class="mt-1 text-sm text-slate-600">
              Masukkan jumlah yang benar-benar dipakai, bukan jumlah yang dibeli.
            </p>
          </div>
          <button type="button" class="btn btn-secondary" @click="addIngredient">
            Tambah bahan
          </button>
        </div>

        <p
          v-if="issueFor('ingredients')"
          class="mt-3 text-sm text-error-600"
          role="alert"
        >
          {{ issueFor('ingredients') }}
        </p>

        <div class="mt-4 space-y-4">
          <fieldset
            v-for="(row, index) in form.ingredients"
            :key="row.rowId"
            class="rounded-lg border border-slate-200 p-4"
          >
            <legend class="px-1 text-sm font-semibold text-slate-700">
              Bahan {{ index + 1 }}
            </legend>

            <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label :for="`bahan-nama-${row.rowId}`" class="label-base">
                  Nama bahan
                </label>
                <input
                  :id="`bahan-nama-${row.rowId}`"
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
                v-model="row.jumlah"
                label="Jumlah"
                :min="0"
                :step="0.01"
                positive
                :error="rowIssue(row.rowId, 'jumlah')"
              />

              <InputSelectSatuan v-model="row.satuan" label="Satuan" />

              <InputRupiah
                v-model="row.hargaPerSatuan"
                label="Harga per satuan"
                hint="Harga untuk 1 satuan yang dipilih."
                :error="rowIssue(row.rowId, 'hargaPerSatuan')"
              />
            </div>

            <div class="mt-3 flex justify-end">
              <button
                type="button"
                class="btn btn-ghost text-error-700 hover:bg-error-50"
                :aria-label="`Hapus bahan ${index + 1}`"
                @click="removeIngredient(index)"
              >
                Hapus bahan
              </button>
            </div>
          </fieldset>
        </div>
      </section>

      <section class="card p-5" aria-labelledby="judul-biaya">
        <h2 id="judul-biaya" class="text-base font-semibold text-slate-900">
          Biaya lain dan target
        </h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InputRupiah
            v-model="form.packagingCost"
            label="Biaya kemasan per batch"
            hint="Kosongkan jika tidak ada; dihitung sebagai Rp0."
          />
          <InputRupiah
            v-model="form.directLaborCost"
            label="Tenaga kerja langsung per batch"
            hint="Upah langsung untuk produksi batch ini."
          />
          <InputRupiah
            v-model="form.allocatedOverhead"
            label="Overhead produksi teralokasi"
            hint="Bagian overhead produksi yang dibebankan ke batch ini."
          />
          <InputPersen
            v-model="form.targetMargin"
            label="Target margin (%)"
            hint="Contoh: 20 untuk target margin 20%."
            :min="0"
            :max="99.99"
            required
            :error="issueFor('targetMargin')"
          />
          <InputRupiah
            v-model="form.currentPrice"
            label="Harga jual saat ini (opsional)"
            hint="Kosongkan jika belum menentukan harga."
            :error="issueFor('currentPrice')"
          />
          <InputRupiah
            v-model="form.fixedCost"
            label="Biaya tetap periode"
            hint="Dipakai hanya untuk break-even, bukan HPP."
          />
          <InputPersen
            v-model="form.materialChange"
            label="Simulasi perubahan harga bahan (%)"
            hint="Gunakan angka negatif untuk penurunan, misalnya -10."
            :min="-100"
            :max="1000"
            :error="issueFor('materialChange')"
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

      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ResultCard
          data-testid="total-biaya-batch"
          title="Total biaya batch"
          :value="rupiahOr(totalBatch)"
          tone="primary"
          description="Bahan + kemasan + tenaga kerja langsung + overhead teralokasi."
        />
        <ResultCard
          data-testid="hpp-per-unit"
          title="HPP per unit"
          :value="rupiahOr(hpp)"
          tone="primary"
          description="Total biaya batch ÷ unit layak jual."
        />
        <ResultCard
          data-testid="harga-minimum"
          title="Harga jual minimum"
          :value="rupiahOr(hargaMinimum)"
          tone="success"
          description="Harga minimum untuk mencapai target margin."
        />
        <ResultCard
          data-testid="margin-aktual"
          title="Margin aktual"
          :value="percentOr(marginAktualValue)"
          tone="neutral"
          description="Laba ÷ harga jual. Basisnya harga jual."
        />
        <ResultCard
          data-testid="markup"
          title="Markup"
          :value="percentOr(markupValue)"
          tone="neutral"
          description="Laba ÷ HPP. Berbeda dari margin."
        />
        <ResultCard
          data-testid="laba-kontribusi"
          title="Laba kontribusi per unit"
          :value="rupiahOr(kontribusiValue)"
          tone="neutral"
          description="Harga jual saat ini − HPP per unit."
        />
        <ResultCard
          data-testid="break-even-unit"
          title="Break-even unit"
          :value="
            breakEvenValue === null ? '—' : `${numberFormat(breakEvenValue)} unit`
          "
          :tone="breakEvenError ? 'warning' : 'neutral'"
          :description="
            breakEvenError ??
            'Jumlah unit yang perlu terjual untuk menutup biaya tetap periode.'
          "
          :status-label="breakEvenError ? 'Tidak tercapai' : ''"
          :status-tone="breakEvenError ? 'warning' : 'neutral'"
        />
        <ResultCard
          data-testid="status-margin"
          title="Status margin"
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
      <dl class="mt-4 divide-y divide-slate-100 text-sm">
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya bahan</dt>
          <dd class="font-medium text-slate-900">{{ rupiahOr(biayaBahan) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Kemasan</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaKemasan) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Tenaga kerja langsung</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaTenagaKerja) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Overhead teralokasi</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(overheadTeralokasi) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="font-medium text-slate-700">Total biaya batch</dt>
          <dd class="font-semibold text-slate-900">{{ rupiahOr(totalBatch) }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Unit layak jual</dt>
          <dd class="font-medium text-slate-900">
            {{ form.batchYield === null ? '—' : `${numberFormat(form.batchYield)} unit` }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya lain di luar bahan</dt>
          <dd class="font-medium text-slate-900">{{ rupiahOr(biayaLain) }}</dd>
        </div>
      </dl>
      <p class="mt-3 text-xs leading-relaxed text-slate-500">
        HPP = total biaya batch ÷ unit layak jual. Harga minimum = HPP ÷
        (1 − target margin). Margin = laba ÷ harga jual; markup = laba ÷ HPP.
      </p>
    </section>

    <section class="card p-5" aria-labelledby="judul-simulasi">
      <h2 id="judul-simulasi" class="text-base font-semibold text-slate-900">
        Simulasi perubahan harga bahan
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Perubahan hanya diterapkan pada biaya bahan. Kemasan, tenaga kerja, dan
        overhead tetap.
      </p>

      <div
        v-if="simulasiResult?.ok"
        class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <ResultCard
          data-testid="simulasi-total-batch"
          title="Total batch setelah perubahan"
          :value="rupiahOr(simulasiResult.value.totalBiayaBatch)"
          tone="primary"
        />
        <ResultCard
          data-testid="simulasi-hpp"
          title="HPP setelah perubahan"
          :value="rupiahOr(simulasiResult.value.hppPerUnit)"
          tone="primary"
        />
        <ResultCard
          data-testid="simulasi-harga-minimum"
          title="Harga minimum setelah perubahan"
          :value="rupiahOr(simulasiResult.value.hargaJualMinimum)"
          tone="success"
        />
        <ResultCard
          data-testid="simulasi-margin"
          title="Margin pada harga saat ini"
          :value="
            marginSimulasiResult?.ok
              ? percentOr(marginSimulasiResult.value)
              : '—'
          "
          tone="neutral"
          :description="
            hargaSaatIni === null
              ? 'Isi harga jual saat ini untuk melihat margin setelah perubahan.'
              : 'Dihitung dengan harga jual saat ini dan HPP setelah perubahan bahan.'
          "
        />
      </div>

      <div
        v-else-if="simulasiResult && !simulasiResult.ok"
        class="mt-4 rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700"
        role="alert"
      >
        {{ simulasiResult.errors[0]?.message ?? 'Simulasi belum dapat dihitung.' }}
      </div>
      <p v-else class="mt-4 text-sm text-slate-600">
        Isi yield batch dan target margin untuk melihat simulasi.
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
        <StatusBadge label="Bukan laba bersih" tone="warning" />
      </div>
      <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-warning-700">
        <li>
          HPP mencakup bahan, kemasan, tenaga kerja langsung, dan overhead
          produksi yang dialokasikan.
        </li>
        <li>
          Angka ini <strong>tidak termasuk</strong> sewa tempat, gaji pemilik,
          listrik dan air kantor, administrasi umum, pajak, bunga pinjaman, dan
          biaya akuisisi pelanggan.
        </li>
        <li>
          Biaya tetap periode hanya dipakai untuk break-even; biaya tersebut
          tidak dimasukkan ke HPP sehingga hasil bukan laba bersih.
        </li>
        <li>
          Perubahan harga bahan hanya diterapkan pada komponen bahan, bukan
          kemasan, tenaga kerja, atau overhead.
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
