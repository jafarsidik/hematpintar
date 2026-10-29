<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import InputPersen from '@/components/InputPersen.vue'
import InputQty from '@/components/InputQty.vue'
import InputRupiah from '@/components/InputRupiah.vue'
import ResultCard from '@/components/ResultCard.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatPercent, formatRupiah } from '@/lib/calc/currency-format'
import type { Result } from '@/lib/calc/result'
import {
  estimasiLabaVolume,
  marginReseller,
  ringkasanBiayaReseller,
  statusLabaReseller,
  type DasarKomisi,
  type LabaPerPesananInput,
  type StatusLabaReseller,
} from '@/lib/calc/reseller'
import { fileDateStamp } from '@/lib/format-date'
import { simulationsToCsv } from '@/lib/storage/csv'
import { downloadCsv } from '@/lib/storage/download'
import { errorMessage } from '@/lib/storage/errors'
import { getSimulationById } from '@/lib/storage/repository'
import {
  SCHEMA_VERSION,
  resellerPayloadSchema,
  type ResellerPayload,
  type SimulationRecord,
} from '@/lib/storage/schemas'
import { useSimulationStore } from '@/stores/simulations'
import { useToastStore } from '@/stores/toast'

interface ResellerForm {
  productName: string
  sellingPrice: number | null
  discount: number | null
  refundAllowance: number | null
  unitCost: number | null
  platformFeeRate: number | null
  platformFeeBase: DasarKomisi
  paymentFee: number | null
  packagingCost: number | null
  sellerShippingSubsidy: number | null
  adCostPerOrder: number | null
  otherCosts: number | null
  orderVolume: number | null
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

interface PerbandinganRow {
  id: string
  nama: string
  labaPerPesanan: number | null
  margin: number | null
  volume: number | null
  estimasiLaba: number | null
  status: StatusLabaReseller | null
  valid: boolean
}

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

function blankForm(): ResellerForm {
  return {
    productName: '',
    sellingPrice: null,
    discount: 0,
    refundAllowance: 0,
    unitCost: null,
    platformFeeRate: null,
    platformFeeBase: 'harga_setelah_diskon',
    paymentFee: 0,
    packagingCost: 0,
    sellerShippingSubsidy: 0,
    adCostPerOrder: 0,
    otherCosts: 0,
    orderVolume: null,
  }
}

const form = reactive<ResellerForm>(blankForm())

const biayaBarang = computed(() => form.unitCost ?? 0)
const biayaPembayaran = computed(() => form.paymentFee ?? 0)
const biayaKemasan = computed(() => form.packagingCost ?? 0)
const subsidiOngkir = computed(() => form.sellerShippingSubsidy ?? 0)
const biayaIklan = computed(() => form.adCostPerOrder ?? 0)
const biayaLain = computed(() => form.otherCosts ?? 0)

const platformBaseLabel = computed(() => {
  switch (form.platformFeeBase) {
    case 'harga_sebelum_diskon':
      return 'Harga sebelum diskon'
    case 'harga_setelah_diskon':
      return 'Harga setelah diskon'
    case 'pendapatan_bersih':
      return 'Pendapatan bersih'
    default:
      return 'Dasar tidak dikenali'
  }
})

const platformBaseDescription = computed(() => {
  switch (form.platformFeeBase) {
    case 'harga_sebelum_diskon':
      return 'Tarif platform dihitung dari harga jual sebelum diskon.'
    case 'harga_setelah_diskon':
      return 'Tarif platform dihitung dari harga jual setelah diskon; refund tidak mengurangi dasar komisi.'
    case 'pendapatan_bersih':
      return 'Tarif platform dihitung dari pendapatan bersih setelah diskon dan refund.'
    default:
      return 'Pilih dasar komisi yang sesuai dengan ketentuan platform.'
  }
})

const platformRateLabel = computed(() =>
  form.platformFeeRate === null
    ? '—'
    : formatPercent(form.platformFeeRate, { maximumFractionDigits: 2 }),
)

const platformFeeDescription = computed(() =>
  form.platformFeeRate === null
    ? `Tarif platform × ${platformBaseLabel.value.toLowerCase()}.`
    : `${platformRateLabel.value} × ${platformBaseLabel.value.toLowerCase()}.`,
)

const inputPerhitungan = computed<LabaPerPesananInput | null>(() => {
  if (
    form.sellingPrice === null ||
    form.unitCost === null ||
    form.platformFeeRate === null
  ) {
    return null
  }

  return {
    hargaJual: form.sellingPrice,
    diskon: form.discount ?? 0,
    refund: form.refundAllowance ?? 0,
    biayaBarang: form.unitCost,
    tarifPlatform: form.platformFeeRate,
    dasarKomisi: form.platformFeeBase,
    biayaIklanPerPesanan: form.adCostPerOrder ?? 0,
    biayaKemasan: form.packagingCost ?? 0,
    subsidiOngkir: form.sellerShippingSubsidy ?? 0,
    biayaPembayaran: form.paymentFee ?? 0,
    biayaLain: form.otherCosts ?? 0,
  }
})

const ringkasanResult = computed(() => {
  if (inputPerhitungan.value === null) return null
  return ringkasanBiayaReseller(inputPerhitungan.value)
})

const ringkasan = computed(() =>
  ringkasanResult.value?.ok ? ringkasanResult.value.value : null,
)

const marginResult = computed(() => {
  if (ringkasan.value === null) return null
  return marginReseller(
    ringkasan.value.labaPerPesanan,
    ringkasan.value.pendapatanBersih,
  )
})

const marginValue = computed(() =>
  marginResult.value?.ok ? marginResult.value.value : null,
)

const volumeResult = computed(() => {
  if (ringkasan.value === null || form.orderVolume === null) return null
  return estimasiLabaVolume(
    ringkasan.value.labaPerPesanan,
    form.orderVolume,
  )
})

const volumeValue = computed(() =>
  volumeResult.value?.ok ? volumeResult.value.value : null,
)

const statusResult = computed(() => {
  if (ringkasan.value === null) return null
  return statusLabaReseller(ringkasan.value.labaPerPesanan)
})

const statusValue = computed(() =>
  statusResult.value?.ok ? statusResult.value.value : null,
)

const labaTone = computed<BadgeTone>(() => {
  if (statusValue.value === 'untung') return 'success'
  if (statusValue.value === 'impas') return 'warning'
  if (statusValue.value === 'rugi') return 'danger'
  return 'neutral'
})

const statusView = computed<StatusView>(() => {
  if (ringkasan.value === null || statusValue.value === null) {
    return {
      tone: 'neutral',
      label: 'Belum dihitung',
      description:
        'Isi harga jual, biaya barang per unit, dan tarif platform untuk menilai status pesanan.',
    }
  }

  const summary = ringkasan.value

  if (statusValue.value === 'rugi') {
    return {
      tone: 'danger',
      label: 'Rugi',
      description: `Setiap pesanan kehilangan ${formatRupiah(Math.abs(summary.labaPerPesanan))} setelah seluruh biaya variabel. Pendapatan bersih ${formatRupiah(summary.pendapatanBersih)} belum menutup total biaya variabel ${formatRupiah(summary.totalBiayaVariabel)}.`,
    }
  }

  if (statusValue.value === 'impas') {
    return {
      tone: 'warning',
      label: 'Impas',
      description: `Laba per pesanan Rp0. Pendapatan bersih ${formatRupiah(summary.pendapatanBersih)} hanya menutup total biaya variabel ${formatRupiah(summary.totalBiayaVariabel)}.`,
    }
  }

  return {
    tone: 'success',
    label: 'Untung',
    description: `Setiap pesanan menghasilkan laba ${formatRupiah(summary.labaPerPesanan)} setelah seluruh biaya variabel.`,
  }
})

const marginDescription = computed(() => {
  if (ringkasan.value === null) {
    return 'Laba per pesanan ÷ pendapatan bersih. Isi data utama untuk menghitung.'
  }
  if (!marginResult.value?.ok) {
    return 'Tidak tersedia karena pendapatan bersih 0 atau negatif. Periksa diskon dan refund.'
  }
  return 'Laba ÷ pendapatan bersih. Bukan laba ÷ biaya barang.'
})

const volumeDescription = computed(() => {
  if (ringkasan.value === null) {
    return 'Isi data utama untuk menghitung estimasi laba volume.'
  }
  if (form.orderVolume === null) {
    return 'Isi volume pesanan untuk menghitung estimasi laba volume.'
  }
  return 'Laba per pesanan × volume pesanan, dengan asumsi biaya dan volume tetap.'
})

const rekomendasi = computed<string[]>(() => {
  const recommendations: string[] = []

  if (inputPerhitungan.value === null) {
    recommendations.push(
      'Isi harga jual, biaya barang per unit, dan tarif platform untuk mulai menghitung.',
    )
    if (form.orderVolume === null) {
      recommendations.push(
        'Isi volume pesanan untuk melihat estimasi laba berdasarkan volume.',
      )
    }
    return recommendations
  }

  if (ringkasanResult.value && !ringkasanResult.value.ok) {
    recommendations.push(
      ringkasanResult.value.errors[0]?.message ??
        'Perhitungan belum dapat dilakukan dengan asumsi saat ini.',
    )
    recommendations.push(
      'Diskon dan refund hanya dikurangkan sekali lewat pendapatan bersih. Pastikan totalnya tidak melebihi harga jual.',
    )
    return recommendations
  }

  const summary = ringkasan.value
  if (summary === null || statusValue.value === null) return recommendations

  if (statusValue.value === 'rugi') {
    recommendations.push(
      `Laba per pesanan negatif ${formatRupiah(summary.labaPerPesanan)}. Naikkan harga jual atau turunkan biaya barang, iklan, kemasan, dan subsidi ongkir.`,
    )
    recommendations.push(
      'Periksa dasar komisi platform. Dasar yang tidak sesuai dapat mengubah biaya platform secara signifikan.',
    )
  } else if (statusValue.value === 'impas') {
    recommendations.push(
      'Laba per pesanan tepat Rp0. Setiap kenaikan biaya variabel akan membuat pesanan merugi, jadi beri ruang margin sebelum menambah diskon atau iklan.',
    )
  } else {
    recommendations.push(
      `Setiap pesanan menghasilkan laba ${formatRupiah(summary.labaPerPesanan)} setelah biaya variabel.`,
    )
    if (marginValue.value !== null) {
      recommendations.push(
        `Margin reseller ${formatPercent(marginValue.value)} dihitung dari laba dibagi pendapatan bersih ${formatRupiah(summary.pendapatanBersih)}.`,
      )
    }
  }

  if (marginResult.value && !marginResult.value.ok) {
    recommendations.push(
      'Margin tidak tersedia karena pendapatan bersih 0 atau negatif. Periksa diskon dan refund.',
    )
  }

  if (subsidiOngkir.value > 0) {
    recommendations.push(
      'Subsidi ongkir dihitung sebagai biaya penjual. Pastikan ongkir ini benar-benar ditanggung penjual dan belum masuk komponen biaya lain.',
    )
  }

  if ((form.discount ?? 0) > 0 || (form.refundAllowance ?? 0) > 0) {
    recommendations.push(
      'Jangan mengurangi diskon atau refund lagi dari biaya lain karena keduanya sudah masuk ke pendapatan bersih.',
    )
  }

  if (volumeValue.value !== null) {
    recommendations.push(
      `Estimasi laba untuk ${numberFormat(form.orderVolume ?? 0)} pesanan adalah ${formatRupiah(volumeValue.value)}. Angka ini bukan laba bersih setelah biaya tetap, pajak, atau risiko retur.`,
    )
  }

  if (perbandingan.value.length > 1) {
    recommendations.push(
      'Perbandingan produk memakai asumsi masing-masing. Jangan memilih produk hanya dari margin tertinggi tanpa mempertimbangkan volume, risiko retur, dan kebutuhan modal.',
    )
  }

  return recommendations
})

function optionalMoneyIssue(
  field: string,
  value: number | null,
  label: string,
): FormIssue | null {
  if (value === null) return null
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return {
      field,
      message: `${label} harus berupa Rupiah bulat atau dikosongkan.`,
    }
  }
  return null
}

const formIssues = computed<FormIssue[]>(() => {
  const issues: FormIssue[] = []

  if (form.productName.trim() === '') {
    issues.push({
      field: 'productName',
      message: 'Nama produk wajib diisi.',
    })
  }

  if (
    form.sellingPrice === null ||
    !Number.isFinite(form.sellingPrice) ||
    form.sellingPrice <= 0 ||
    !Number.isInteger(form.sellingPrice)
  ) {
    issues.push({
      field: 'sellingPrice',
      message: 'Harga jual wajib diisi dan harus lebih besar dari 0.',
    })
  }

  if (
    form.unitCost === null ||
    !Number.isFinite(form.unitCost) ||
    form.unitCost < 0 ||
    !Number.isInteger(form.unitCost)
  ) {
    issues.push({
      field: 'unitCost',
      message: 'Biaya barang wajib diisi dalam Rupiah bulat (Rp0 atau lebih).',
    })
  }

  if (
    form.platformFeeRate === null ||
    !Number.isFinite(form.platformFeeRate) ||
    form.platformFeeRate < 0 ||
    form.platformFeeRate > 1
  ) {
    issues.push({
      field: 'platformFeeRate',
      message: 'Tarif platform wajib diisi antara 0% dan 100%.',
    })
  }

  if (
    form.orderVolume === null ||
    !Number.isFinite(form.orderVolume) ||
    form.orderVolume <= 0 ||
    !Number.isInteger(form.orderVolume)
  ) {
    issues.push({
      field: 'orderVolume',
      message: 'Volume pesanan harus bilangan bulat lebih besar dari 0.',
    })
  }

  const optionalIssues = [
    optionalMoneyIssue('discount', form.discount, 'Diskon penjual'),
    optionalMoneyIssue('refundAllowance', form.refundAllowance, 'Cadangan refund'),
    optionalMoneyIssue('paymentFee', form.paymentFee, 'Biaya pembayaran'),
    optionalMoneyIssue('packagingCost', form.packagingCost, 'Biaya kemasan'),
    optionalMoneyIssue(
      'sellerShippingSubsidy',
      form.sellerShippingSubsidy,
      'Subsidi ongkir',
    ),
    optionalMoneyIssue('adCostPerOrder', form.adCostPerOrder, 'Biaya iklan'),
    optionalMoneyIssue('otherCosts', form.otherCosts, 'Biaya lain'),
  ].filter((issue): issue is FormIssue => issue !== null)

  issues.push(...optionalIssues)

  return issues
})

const calculationErrors = computed(() => {
  const results: (Result<unknown> | null)[] = [
    ringkasanResult.value,
    volumeResult.value,
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

function statusLabel(status: StatusLabaReseller | null): string {
  if (status === 'untung') return 'Untung'
  if (status === 'impas') return 'Impas'
  if (status === 'rugi') return 'Rugi'
  return '—'
}

function statusTone(status: StatusLabaReseller | null): BadgeTone {
  if (status === 'untung') return 'success'
  if (status === 'impas') return 'warning'
  if (status === 'rugi') return 'danger'
  return 'neutral'
}

function isiContoh(): void {
  Object.assign(form, {
    productName: 'Kaos Katun',
    sellingPrice: 150_000,
    discount: 10_000,
    refundAllowance: 0,
    unitCost: 80_000,
    platformFeeRate: 0.08,
    platformFeeBase: 'harga_setelah_diskon',
    paymentFee: 2_000,
    packagingCost: 3_000,
    sellerShippingSubsidy: 4_800,
    adCostPerOrder: 4_000,
    otherCosts: 0,
    orderVolume: 50,
  })
  currentSimulationId.value = null
  showIssues.value = false
  if (route.query.simulation) {
    void router.replace({ path: route.path, query: {} })
  }
}

function applyPayload(payload: ResellerPayload): void {
  Object.assign(form, {
    productName: payload.productName,
    sellingPrice: payload.sellingPrice,
    discount: payload.discount,
    refundAllowance: payload.refundAllowance,
    unitCost: payload.unitCost,
    platformFeeRate: payload.platformFeeRate,
    platformFeeBase: payload.platformFeeBase,
    paymentFee: payload.paymentFee,
    packagingCost: payload.packagingCost,
    sellerShippingSubsidy: payload.sellerShippingSubsidy,
    adCostPerOrder: payload.adCostPerOrder,
    otherCosts: payload.otherCosts,
    orderVolume: payload.orderVolume,
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

  if (result.value.moduleType !== 'reseller') {
    toastStore.error('Simulasi ini bukan simulasi Profit Kit Reseller.')
    return
  }

  const parsed = resellerPayloadSchema.safeParse(result.value.payload)
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

function buildPayload(): ResellerPayload | null {
  if (
    form.sellingPrice === null ||
    form.unitCost === null ||
    form.platformFeeRate === null ||
    form.orderVolume === null
  ) {
    return null
  }

  const productName = form.productName.trim()
  if (productName === '') return null

  return {
    productName,
    sellingPrice: form.sellingPrice,
    discount: form.discount ?? 0,
    refundAllowance: form.refundAllowance ?? 0,
    unitCost: form.unitCost,
    platformFeeRate: form.platformFeeRate,
    platformFeeBase: form.platformFeeBase,
    paymentFee: form.paymentFee ?? 0,
    packagingCost: form.packagingCost ?? 0,
    sellerShippingSubsidy: form.sellerShippingSubsidy ?? 0,
    adCostPerOrder: form.adCostPerOrder ?? 0,
    otherCosts: form.otherCosts ?? 0,
    orderVolume: form.orderVolume,
  }
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
        name: payload.productName,
        payload,
      })
    : await simulationStore.create({
        moduleType: 'reseller',
        name: payload.productName,
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
  const parsed = resellerPayloadSchema.safeParse(result.value.payload)
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
    moduleType: 'reseller',
    name: payload.productName,
    payload,
    createdAt: timestamp,
    updatedAt: timestamp,
    schemaVersion: SCHEMA_VERSION,
  }

  const csv = simulationsToCsv('reseller', [record])
  downloadCsv(`hematpintar-reseller-${fileDateStamp()}.csv`, csv)
  toastStore.success('CSV simulasi Profit Kit Reseller berhasil diunduh.')
}

const perbandingan = computed<PerbandinganRow[]>(() =>
  simulationStore.items
    .filter((simulation) => simulation.moduleType === 'reseller')
    .map((record) => {
      const parsed = resellerPayloadSchema.safeParse(record.payload)
      if (!parsed.success) {
        return {
          id: record.id,
          nama: record.name,
          labaPerPesanan: null,
          margin: null,
          volume: null,
          estimasiLaba: null,
          status: null,
          valid: false,
        }
      }

      const payload = parsed.data
      const summaryResult = ringkasanBiayaReseller({
        hargaJual: payload.sellingPrice,
        diskon: payload.discount,
        refund: payload.refundAllowance,
        biayaBarang: payload.unitCost,
        tarifPlatform: payload.platformFeeRate,
        dasarKomisi: payload.platformFeeBase,
        biayaIklanPerPesanan: payload.adCostPerOrder,
        biayaKemasan: payload.packagingCost,
        subsidiOngkir: payload.sellerShippingSubsidy,
        biayaPembayaran: payload.paymentFee,
        biayaLain: payload.otherCosts,
      })

      if (!summaryResult.ok) {
        return {
          id: record.id,
          nama: payload.productName,
          labaPerPesanan: null,
          margin: null,
          volume: payload.orderVolume,
          estimasiLaba: null,
          status: null,
          valid: false,
        }
      }

      const summary = summaryResult.value
      const margin = marginReseller(
        summary.labaPerPesanan,
        summary.pendapatanBersih,
      )
      const estimasi = estimasiLabaVolume(
        summary.labaPerPesanan,
        payload.orderVolume,
      )
      const status = statusLabaReseller(summary.labaPerPesanan)

      return {
        id: record.id,
        nama: payload.productName,
        labaPerPesanan: summary.labaPerPesanan,
        margin: margin.ok ? margin.value : null,
        volume: payload.orderVolume,
        estimasiLaba: estimasi.ok ? estimasi.value : null,
        status: status.ok ? status.value : null,
        valid: true,
      }
    }),
)

onMounted(async () => {
  const result = await simulationStore.load('reseller')
  if (!result.ok) {
    toastStore.error(errorMessage(result.errors))
  }
})
</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p class="text-sm font-medium text-primary-700">Profit Kit Reseller</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Hitung laba bersih per pesanan marketplace
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Masukkan harga, diskon, biaya platform, dan biaya operasional per
          pesanan. Hasil dihitung langsung dengan mesin kalkulasi yang sama
          dengan pengujian.
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
          Produk dan harga
        </h2>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div class="md:col-span-2">
            <label for="reseller-nama-produk" class="label-base">
              Nama produk
              <span class="text-error-600" aria-hidden="true">*</span>
            </label>
            <input
              id="reseller-nama-produk"
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

          <InputRupiah
            v-model="form.sellingPrice"
            label="Harga jual"
            hint="Harga jual sebelum diskon."
            required
            :error="issueFor('sellingPrice')"
          />

          <InputRupiah
            v-model="form.discount"
            label="Diskon penjual"
            hint="Diskon yang ditanggung penjual; kosongkan jika tidak ada."
            :error="issueFor('discount')"
          />

          <InputRupiah
            v-model="form.refundAllowance"
            label="Cadangan refund"
            hint="Refund yang dialokasikan ke pesanan ini, bukan refund setelah pendapatan bersih."
            :error="issueFor('refundAllowance')"
          />

          <InputRupiah
            v-model="form.unitCost"
            label="Biaya barang per unit"
            required
            :error="issueFor('unitCost')"
          />

          <InputPersen
            v-model="form.platformFeeRate"
            label="Tarif platform (%)"
            hint="Contoh: 8 untuk tarif 8%."
            :min="0"
            :max="100"
            required
            :error="issueFor('platformFeeRate')"
          />

          <div>
            <label for="reseller-dasar-komisi" class="label-base">
              Dasar komisi platform
            </label>
            <select
              id="reseller-dasar-komisi"
              v-model="form.platformFeeBase"
              class="input-base"
            >
              <option value="harga_sebelum_diskon">
                Harga sebelum diskon
              </option>
              <option value="harga_setelah_diskon">
                Harga setelah diskon
              </option>
              <option value="pendapatan_bersih">
                Pendapatan bersih
              </option>
            </select>
            <p class="mt-1.5 text-xs text-slate-500">
              {{ platformBaseDescription }}
            </p>
          </div>
        </div>
      </section>

      <section class="card p-5" aria-labelledby="judul-biaya">
        <h2 id="judul-biaya" class="text-base font-semibold text-slate-900">
          Biaya per pesanan
        </h2>
        <p class="mt-1 text-sm text-slate-600">
          Masukkan biaya aktual per pesanan. Kosongkan komponen yang tidak ada;
          nilainya dihitung sebagai Rp0.
        </p>
        <div class="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InputRupiah
            v-model="form.paymentFee"
            label="Biaya pembayaran"
            hint="Biaya payment gateway atau biaya transaksi."
            :error="issueFor('paymentFee')"
          />
          <InputRupiah
            v-model="form.packagingCost"
            label="Biaya kemasan"
            :error="issueFor('packagingCost')"
          />
          <InputRupiah
            v-model="form.sellerShippingSubsidy"
            label="Subsidi ongkir penjual"
            hint="Hanya isi jika ongkir benar-benar ditanggung penjual."
            :error="issueFor('sellerShippingSubsidy')"
          />
          <InputRupiah
            v-model="form.adCostPerOrder"
            label="Biaya iklan per pesanan"
            hint="Biaya iklan yang dialokasikan ke satu pesanan."
            :error="issueFor('adCostPerOrder')"
          />
          <InputRupiah
            v-model="form.otherCosts"
            label="Biaya lain"
            hint="Biaya variabel lain yang belum masuk komponen di atas."
            :error="issueFor('otherCosts')"
          />
          <InputQty
            v-model="form.orderVolume"
            label="Volume pesanan"
            hint="Jumlah pesanan untuk estimasi laba volume."
            :min="1"
            :step="1"
            positive
            required
            satuan="pesanan"
            :error="issueFor('orderVolume')"
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
          data-testid="pendapatan-bersih"
          title="Pendapatan bersih"
          :value="rupiahOr(ringkasan?.pendapatanBersih ?? null)"
          tone="primary"
          description="Harga jual − diskon − refund."
        />
        <ResultCard
          data-testid="biaya-platform"
          title="Biaya platform"
          :value="rupiahOr(ringkasan?.biayaPlatform ?? null)"
          tone="warning"
          :description="platformFeeDescription"
        />
        <ResultCard
          data-testid="total-biaya-variabel"
          title="Total biaya variabel"
          :value="rupiahOr(ringkasan?.totalBiayaVariabel ?? null)"
          tone="warning"
          description="Barang + platform + pembayaran + iklan + kemasan + ongkir + biaya lain."
        />
        <ResultCard
          data-testid="laba-per-pesanan"
          title="Laba per pesanan"
          :value="rupiahOr(ringkasan?.labaPerPesanan ?? null)"
          :tone="labaTone"
          description="Pendapatan bersih − total biaya variabel."
          :status-label="statusValue ? statusView.label : ''"
          :status-tone="statusValue ? statusView.tone : 'neutral'"
        />
        <ResultCard
          data-testid="margin-reseller"
          title="Margin reseller"
          :value="percentOr(marginValue)"
          tone="neutral"
          :description="marginDescription"
        />
        <ResultCard
          data-testid="laba-volume"
          title="Estimasi laba volume"
          :value="rupiahOr(volumeValue)"
          tone="success"
          :description="volumeDescription"
        />
        <ResultCard
          data-testid="status-reseller"
          title="Status pesanan"
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
          <dt class="text-slate-600">Harga jual sebelum diskon</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(form.sellingPrice) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Diskon penjual</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(form.discount ?? 0) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Cadangan refund</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(form.refundAllowance ?? 0) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="font-medium text-slate-700">Pendapatan bersih</dt>
          <dd class="font-semibold text-slate-900">
            {{ rupiahOr(ringkasan?.pendapatanBersih ?? null) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">
            Dasar komisi ({{ platformBaseLabel.toLowerCase() }})
          </dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(ringkasan?.dasarKomisi ?? null) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">
            Biaya platform ({{ platformRateLabel }})
          </dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(ringkasan?.biayaPlatform ?? null) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya barang</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaBarang) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya pembayaran</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaPembayaran) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya iklan</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaIklan) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya kemasan</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaKemasan) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Subsidi ongkir</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(subsidiOngkir) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Biaya lain</dt>
          <dd class="font-medium text-slate-900">
            {{ formatRupiah(biayaLain) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="font-medium text-slate-700">Total biaya variabel</dt>
          <dd class="font-semibold text-slate-900">
            {{ rupiahOr(ringkasan?.totalBiayaVariabel ?? null) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="font-medium text-slate-700">Laba per pesanan</dt>
          <dd class="font-semibold text-slate-900">
            {{ rupiahOr(ringkasan?.labaPerPesanan ?? null) }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Volume pesanan</dt>
          <dd class="font-medium text-slate-900">
            {{
              form.orderVolume === null
                ? '—'
                : `${numberFormat(form.orderVolume)} pesanan`
            }}
          </dd>
        </div>
        <div class="flex items-center justify-between gap-4 py-2">
          <dt class="text-slate-600">Estimasi laba volume</dt>
          <dd class="font-medium text-slate-900">
            {{ rupiahOr(volumeValue) }}
          </dd>
        </div>
      </dl>
      <p class="mt-3 text-xs leading-relaxed text-slate-500">
        Pendapatan bersih = harga jual − diskon − refund. Biaya platform =
        tarif × dasar komisi yang dipilih. Laba per pesanan = pendapatan bersih
        − total biaya variabel. Margin = laba ÷ pendapatan bersih.
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

    <section class="card p-5" aria-labelledby="judul-perbandingan">
      <h2 id="judul-perbandingan" class="text-base font-semibold text-slate-900">
        Perbandingan produk
      </h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Produk tersimpan dibandingkan memakai asumsi masing-masing. Angka
        berikut bukan penilaian produk terbaik: volume, risiko retur, dan
        kebutuhan modal dapat berbeda.
      </p>

      <p v-if="simulationStore.loading" class="mt-4 text-sm text-slate-600">
        Memuat simulasi tersimpan...
      </p>
      <p
        v-else-if="perbandingan.length === 0"
        class="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"
      >
        Belum ada simulasi reseller tersimpan. Simpan simulasi untuk
        membandingkan laba per pesanan, margin, dan estimasi laba volume.
      </p>
      <div v-else class="mt-4 overflow-x-auto">
        <table class="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr class="border-b border-slate-200 text-slate-600">
              <th class="py-2 pr-4 font-medium">Produk</th>
              <th class="py-2 pr-4 font-medium">Laba/pesanan</th>
              <th class="py-2 pr-4 font-medium">Margin</th>
              <th class="py-2 pr-4 font-medium">Volume</th>
              <th class="py-2 pr-4 font-medium">Estimasi laba</th>
              <th class="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in perbandingan"
              :key="row.id"
              class="border-b border-slate-100 last:border-0"
            >
              <td class="py-2 pr-4 font-medium text-slate-900">
                {{ row.nama }}
                <span
                  v-if="!row.valid"
                  class="ml-1 text-xs font-normal text-warning-700"
                >
                  (data tidak dapat dihitung)
                </span>
              </td>
              <td class="py-2 pr-4 text-slate-700">
                {{ rupiahOr(row.labaPerPesanan) }}
              </td>
              <td class="py-2 pr-4 text-slate-700">
                {{ percentOr(row.margin) }}
              </td>
              <td class="py-2 pr-4 text-slate-700">
                {{ row.volume === null ? '—' : `${numberFormat(row.volume)} pesanan` }}
              </td>
              <td class="py-2 pr-4 text-slate-700">
                {{ rupiahOr(row.estimasiLaba) }}
              </td>
              <td class="py-2">
                <StatusBadge
                  v-if="row.status"
                  :label="statusLabel(row.status)"
                  :tone="statusTone(row.status)"
                />
                <span v-else class="text-slate-500">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
          Tarif dan dasar komisi platform dapat berubah. Periksa jadwal biaya
          platform yang berlaku sebelum memakai angka ini.
        </li>
        <li>
          Subsidi ongkir hanya dikurangkan jika pengiriman benar-benar menjadi
          tanggungan penjual dan belum masuk komponen biaya lain.
        </li>
        <li>
          Diskon dan refund hanya dikurangkan sekali lewat pendapatan bersih.
          Jangan memasukkan potongan yang sama ke biaya lain.
        </li>
        <li>
          Perbandingan produk hanya valid jika harga, komisi, biaya, dan volume
          memakai asumsi yang sebanding. Risiko retur dan kebutuhan modal dapat
          berbeda.
        </li>
        <li>
          Estimasi laba volume mengasumsikan laba per pesanan dan volume tetap.
          Angka ini belum memperhitungkan biaya tetap, pajak, dan biaya di luar
          daftar.
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
