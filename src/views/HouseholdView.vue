<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useHouseholdStore } from '@/stores/household'
import { useToastStore } from '@/stores/toast'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import InputRupiah from '@/components/InputRupiah.vue'
import InputQty from '@/components/InputQty.vue'
import InputSelectSatuan from '@/components/InputSelectSatuan.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { formatPercent, formatRupiah } from '@/lib/calc/currency-format'
import {
  hargaEfektifProduk,
  hargaPerSatuanProduk,
  satuanStandar,
  selisihHematDariTermurah,
  statusKesegaranHarga,
} from '@/lib/calc/household'
import { dimensiSatuan } from '@/lib/calc/unit-conversion'
import { normalizeLinkSource } from '@/lib/links/normalize-url'
import { fileDateStamp } from '@/lib/format-date'
import { downloadCsv } from '@/lib/storage/download'
import {
  buildWhatsAppBelanjaMessage,
  buildWhatsAppUrl,
} from '@/lib/plans/whatsapp'
import type { SavedProduct } from '@/lib/storage/household-needs'

const authStore = useAuthStore()
const store = useHouseholdStore()
const toastStore = useToastStore()

interface EditingProduct extends SavedProduct {
  editing: boolean
  editedUrl: string
  editedTitle: string
  editedStoreName: string | null
  editedPrice: number | null
  editedPackSize: number | null
  editedPackUnit: 'g' | 'kg' | 'ml' | 'l' | 'pcs'
  editedShippingCost: number | null
  editedVoucherDiscount: number | null
  editedNote: string | null
  editedPriceCheckedAt: string | null
  urlError: string | null
}

interface ProductWithCalculation extends SavedProduct {
  hargaEfektif: number | null
  hargaPerSatuan: number | null
  satuanStandar: 'kg' | 'l' | 'pcs' | null
  seri: boolean
  termurah: boolean
  segar: boolean
  satuanTidakSebanding: boolean
  selisihDariTermurah: number | null
}

const needs = computed(() => store.needs)
const productsMap = computed(() => store.productsByNeed)
const budget = computed(() => store.budget)
const error = computed(() => store.error)

const needsLoading = ref(false)
const productsLoading = ref(false)
const showAddNeed = ref(false)
const showAddProduct = ref<string | null>(null)
const needName = ref('')
const needTargetQty = ref<number | null>(null)
const needUnit = ref<'g' | 'kg' | 'ml' | 'l' | 'pcs' | undefined>(undefined)
const deleteOpen = ref<{
  id: string
  name: string
  needId?: string
  isProduct?: boolean
} | null>(null)
const activeNeedId = ref<string | null>(null)

interface NewProductForm {
  title: string
  platform: string
  storeName: string | null
  url: string
  urlError: string | null
  price: number | null
  packSize: number | null
  packUnit: 'g' | 'kg' | 'ml' | 'l' | 'pcs'
  shippingCost: number | null
  voucherDiscount: number | null
  note: string | null
  priceCheckedAt: string | null
}

const newProduct = reactive<NewProductForm>({
  title: '',
  platform: '',
  storeName: null,
  url: '',
  urlError: null,
  price: null,
  packSize: null,
  packUnit: 'kg',
  shippingCost: null,
  voucherDiscount: null,
  note: null,
  priceCheckedAt: '',
})

const editingProduct = ref<EditingProduct | null>(null)
const budgetInput = ref<number | null>(null)
const showExamplePicker = ref(false)

interface ExampleProduct {
  title: string
  platform: string
  store_name: string | null
  url: string
  price: number
  pack_size: number
  pack_unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs'
  shipping_cost: number
  voucher_discount: number
  note: string | null
}

interface ExampleNeed {
  name: string
  target_qty: number
  unit: 'g' | 'kg' | 'ml' | 'l' | 'pcs'
  monthlyBudget: number
  products: ExampleProduct[]
}

const EXAMPLE_CATEGORIES: readonly ExampleNeed[] = [
  {
    name: 'Sembako Bulanan',
    target_qty: 1,
    unit: 'pcs',
    monthlyBudget: 200_000,
    products: [
      {
        title: 'Beras Premium 5 kg',
        platform: 'Shopee',
        store_name: 'Toko A',
        url: 'https://shopee.co.id/beras-premium',
        price: 75_000,
        pack_size: 5,
        pack_unit: 'kg',
        shipping_cost: 10_000,
        voucher_discount: 3_000,
        note: 'Beras premium untuk keluarga',
      },
      {
        title: 'Minyak Goreng 2 liter',
        platform: 'Tokopedia',
        store_name: 'Toko B',
        url: 'https://tokopedia.com/minyak-2l',
        price: 30_000,
        pack_size: 2,
        pack_unit: 'l',
        shipping_cost: 5_000,
        voucher_discount: 0,
        note: 'Minyak goreng kemasan besar',
      },
      {
        title: 'Gula Pasir 1 kg',
        platform: 'Lazada',
        store_name: 'Toko C',
        url: 'https://lazada.co.id/gula-1kg',
        price: 15_000,
        pack_size: 1,
        pack_unit: 'kg',
        shipping_cost: 3_000,
        voucher_discount: 0,
        note: 'Gula pasir standar',
      },
      {
        title: 'Telur Ayam 1 kg',
        platform: 'Shopee',
        store_name: 'Toko A',
        url: 'https://shopee.co.id/telur-1kg',
        price: 24_000,
        pack_size: 1,
        pack_unit: 'kg',
        shipping_cost: 2_000,
        voucher_discount: 0,
        note: 'Telur ayam kampung',
      },
      {
        title: 'Sabun Mandi 3 pcs',
        platform: 'Tokopedia',
        store_name: 'Toko B',
        url: 'https://tokopedia.com/sabun-3pcs',
        price: 18_000,
        pack_size: 3,
        pack_unit: 'pcs',
        shipping_cost: 4_000,
        voucher_discount: 2_000,
        note: 'Sabun mandi batang',
      },
    ],
  },
  {
    name: 'Makanan Siap Saji',
    target_qty: 1,
    unit: 'pcs',
    monthlyBudget: 150_000,
    products: [
      {
        title: 'Indomie Goreng 1 pak (5 pcs)',
        platform: 'Shopee',
        store_name: 'Toko A',
        url: 'https://shopee.co.id/indomie',
        price: 30_000,
        pack_size: 5,
        pack_unit: 'pcs',
        shipping_cost: 5_000,
        voucher_discount: 0,
        note: 'Mie instan rasa goreng',
      },
      {
        title: 'Mie Sedaap 1 pak (5 pcs)',
        platform: 'Tokopedia',
        store_name: 'Toko B',
        url: 'https://tokopedia.com/mie-sedaap',
        price: 28_000,
        pack_size: 5,
        pack_unit: 'pcs',
        shipping_cost: 5_000,
        voucher_discount: 0,
        note: 'Mie instan rasa kari ayam',
      },
      {
        title: 'Teh Kotak 1 liter (12 pcs)',
        platform: 'Lazada',
        store_name: 'Toko C',
        url: 'https://lazada.co.id/teh-kotak',
        price: 48_000,
        pack_size: 12,
        pack_unit: 'pcs',
        shipping_cost: 8_000,
        voucher_discount: 3_000,
        note: 'Teh kotak kotak 1 liter',
      },
      {
        title: 'Kopi Kapal Api 10 sachet',
        platform: 'Shopee',
        store_name: 'Toko A',
        url: 'https://shopee.co.id/kopi-kapal-api',
        price: 15_000,
        pack_size: 10,
        pack_unit: 'pcs',
        shipping_cost: 3_000,
        voucher_discount: 0,
        note: 'Kopi instan sachet',
      },
    ],
  },
  {
    name: 'Stok Warung Kecil',
    target_qty: 1,
    unit: 'pcs',
    monthlyBudget: 180_000,
    products: [
      {
        title: 'Gula Pasir 1 kg',
        platform: 'Tokopedia',
        store_name: 'Toko B',
        url: 'https://tokopedia.com/gula-1kg',
        price: 15_000,
        pack_size: 1,
        pack_unit: 'kg',
        shipping_cost: 3_000,
        voucher_discount: 0,
        note: 'Gula pasir untuk warung',
      },
      {
        title: 'Minyak Goreng 2 liter',
        platform: 'Lazada',
        store_name: 'Toko C',
        url: 'https://lazada.co.id/minyak-2l',
        price: 30_000,
        pack_size: 2,
        pack_unit: 'l',
        shipping_cost: 5_000,
        voucher_discount: 0,
        note: 'Minyak goreng kemasan besar',
      },
      {
        title: 'Kopi Hitam 10 sachet',
        platform: 'Shopee',
        store_name: 'Toko A',
        url: 'https://shopee.co.id/kopi-hitam',
        price: 12_000,
        pack_size: 10,
        pack_unit: 'pcs',
        shipping_cost: 3_000,
        voucher_discount: 0,
        note: 'Kopi hitam sachet',
      },
      {
        title: 'Rokok Kretek 1 batang (10 pcs)',
        platform: 'Tokopedia',
        store_name: 'Toko B',
        url: 'https://tokopedia.com/rokok',
        price: 24_000,
        pack_size: 10,
        pack_unit: 'pcs',
        shipping_cost: 2_000,
        voucher_discount: 0,
        note: 'Rokok kretek batang',
      },
      {
        title: 'Sabun Cuci 1 pcs',
        platform: 'Lazada',
        store_name: 'Toko C',
        url: 'https://lazada.co.id/sabun-cuci',
        price: 8_000,
        pack_size: 1,
        pack_unit: 'pcs',
        shipping_cost: 2_000,
        voucher_discount: 0,
        note: 'Sabun cuci piring',
      },
    ],
  },
]

watch(
  () => budget.value,
  (val) => {
    budgetInput.value = val?.monthly_budget ?? null
  },
  { immediate: true },
)

function productsFor(needId: string): SavedProduct[] {
  return productsMap.value[needId] ?? []
}

function selectedProductId(needId: string): string | null {
  const need = needs.value.find((n) => n.id === needId)
  return need ? need.chosen_product_id : null
}

function formatDateInput(value: string | null): string {
  if (!value) return ''
  return value.slice(0, 16)
}

function newEditingProduct(product: SavedProduct): EditingProduct {
  return {
    ...product,
    editing: true,
    editedUrl: product.url,
    editedTitle: product.title,
    editedStoreName: product.store_name,
    editedPrice: product.price,
    editedPackSize: product.pack_size,
    editedPackUnit: product.pack_unit as
      | 'g' | 'kg' | 'ml' | 'l' | 'pcs',
    editedShippingCost: product.shipping_cost,
    editedVoucherDiscount: product.voucher_discount,
    editedNote: product.note,
    editedPriceCheckedAt: formatDateInput(product.price_checked_at),
    urlError: null,
  }
}

async function loadData(): Promise<void> {
  needsLoading.value = true
  try {
    await store.fetchNeeds()
    await store.fetchBudget()
    for (const need of needs.value) {
      await store.fetchProducts(need.id)
    }
  } catch {
    toastStore.error('Gagal memuat data kebutuhan rumah tangga.')
  } finally {
    needsLoading.value = false
  }
}

watch(
  () => authStore.isAuthenticated,
  (authenticated) => {
    if (authenticated) void loadData()
  },
  { immediate: true },
)

function productCalculation(
  product: SavedProduct,
  allProductsOfNeed: SavedProduct[],
): ProductWithCalculation {
  const efektif = hargaEfektifProduk({
    harga: product.price,
    ongkir: product.shipping_cost,
    voucher: product.voucher_discount,
  })
  const hargaEfektif = efektif.ok ? efektif.value : null

  let hargaPerSatuan: number | null = null
  let standarSatuan: 'kg' | 'l' | 'pcs' | null = null

  if (hargaEfektif !== null) {
    const ps = hargaPerSatuanProduk({
      hargaEfektif,
      isi: product.pack_size,
      satuan: product.pack_unit as 'g' | 'kg' | 'ml' | 'l' | 'pcs',
    })
    if (ps.ok) {
      hargaPerSatuan = ps.value
      standarSatuan = satuanStandar(
        product.pack_unit as 'g' | 'kg' | 'ml' | 'l' | 'pcs',
      )
    }
  }

  const productsWithPrice = allProductsOfNeed
    .map((p) => {
      const e = hargaEfektifProduk({
        harga: p.price,
        ongkir: p.shipping_cost,
        voucher: p.voucher_discount,
      })
      return e.ok ? e.value : null
    })
    .filter((v): v is number => v !== null)

  const termurah =
    hargaEfektif !== null &&
    productsWithPrice.length > 0 &&
    hargaEfektif === Math.min(...productsWithPrice)

  const checkedAt = product.price_checked_at
    ? product.price_checked_at
    : null
  const segar =
    checkedAt !== null &&
    statusKesegaranHarga(checkedAt, new Date().toISOString()) === 'segar'

  const satuanTidakSebanding =
    allProductsOfNeed.some(
      (p) =>
        dimensiSatuan(p.pack_unit as 'g' | 'kg' | 'ml' | 'l' | 'pcs') !==
        dimensiSatuan(product.pack_unit as 'g' | 'kg' | 'ml' | 'l' | 'pcs'),
    ) && allProductsOfNeed.length > 1

  let selisihDariTermurah: number | null = null
  if (hargaEfektif !== null && !termurah && productsWithPrice.length > 0) {
    const minPrice = Math.min(...productsWithPrice)
    const termurahProduk = allProductsOfNeed.find((p) => {
      const e = hargaEfektifProduk({
        harga: p.price,
        ongkir: p.shipping_cost,
        voucher: p.voucher_discount,
      })
      return e.ok && e.value === minPrice
    })
    if (termurahProduk) {
      const selisih = selisihHematDariTermurah(
        {
          harga: product.price,
          ongkir: product.shipping_cost,
          voucher: product.voucher_discount,
        },
        {
          harga: termurahProduk.price,
          ongkir: termurahProduk.shipping_cost,
          voucher: termurahProduk.voucher_discount,
        },
      )
      if (selisih.ok) selisihDariTermurah = selisih.value
    }
  }

  return {
    ...product,
    hargaEfektif,
    hargaPerSatuan,
    satuanStandar: standarSatuan,
    seri: false,
    termurah,
    segar,
    satuanTidakSebanding,
    selisihDariTermurah,
  }
}

function rankedProducts(needId: string): ProductWithCalculation[] {
  const all = productsFor(needId)
  return all.map((product) => productCalculation(product, all))
}

function selectedTotal(): number {
  let total = 0
  for (const need of needs.value) {
    if (!need.chosen_product_id) continue
    const product = productsFor(need.id).find((p) => p.id === need.chosen_product_id)
    if (!product) continue
    const efektif = hargaEfektifProduk({
      harga: product.price,
      ongkir: product.shipping_cost,
      voucher: product.voucher_discount,
    })
    if (efektif.ok) total += efektif.value
  }
  return total
}

function maxNonSelectedEffectif(needId: string): number | null {
  const all = productsFor(needId)
  const chosen = selectedProductId(needId)
  const values = all
    .filter((p) => p.id !== chosen)
    .map((p) => {
      const e = hargaEfektifProduk({
        harga: p.price,
        ongkir: p.shipping_cost,
        voucher: p.voucher_discount,
      })
      return e.ok ? e.value : null
    })
    .filter((v): v is number => v !== null)
  return values.length > 0 ? Math.max(...values) : null
}

function penghematanDariTermahal(): number {
  let total = 0
  for (const need of needs.value) {
    if (!need.chosen_product_id) continue
    const product = productsFor(need.id).find((p) => p.id === need.chosen_product_id)
    if (!product) continue
    const termahal = maxNonSelectedEffectif(need.id)
    if (termahal === null) continue
    const efektif = hargaEfektifProduk({
      harga: product.price,
      ongkir: product.shipping_cost,
      voucher: product.voucher_discount,
    })
    if (efektif.ok && termahal > efektif.value) total += termahal - efektif.value
  }
  return total
}

async function addNeed(): Promise<void> {
  if (!needName.value.trim()) return
  const result = await store.createNeedItem({
    name: needName.value.trim(),
    target_qty: needTargetQty.value,
    unit: needUnit.value ?? undefined,
  })
  if (result) {
    needName.value = ''
    needTargetQty.value = null
    needUnit.value = undefined
    showAddNeed.value = false
    activeNeedId.value = result.id
    await store.fetchProducts(result.id)
    toastStore.success('Kebutuhan berhasil dibuat.')
  }
}

async function saveProduct(needId: string): Promise<void> {
  const editor = editingProduct.value
  if (!editor) return

  const normalized = normalizeLinkSource(editor.editedUrl)
  if ('error' in normalized) {
    editingProduct.value = { ...editor, urlError: normalized.error }
    return
  }

  const input = {
    title: editor.editedTitle.trim(),
    platform: editor.editedTitle ? editor.editedTitle : 'Lainnya',
    store_name: editor.editedStoreName ?? undefined,
    url: normalized.url,
    price: editor.editedPrice ?? 0,
    pack_size: editor.editedPackSize ?? 0,
    pack_unit: editor.editedPackUnit,
    shipping_cost: editor.editedShippingCost ?? 0,
    voucher_discount: editor.editedVoucherDiscount ?? 0,
    note: editor.editedNote ?? undefined,
    price_checked_at: editor.editedPriceCheckedAt
      ? `${editor.editedPriceCheckedAt}:00`
      : new Date().toISOString(),
  }

  let ok = false
  if (editor.id) {
    const result = await store.updateNeedProduct(
      editor.id,
      editor.need_id,
      input,
    )
    ok = !!result
  } else {
    const result = await store.createNeedProduct(needId, input)
    ok = !!result
  }

  if (ok) {
    editingProduct.value = null
    await store.fetchProducts(needId)
    toastStore.success('Produk berhasil disimpan.')
  }
}

function addProductToNeed(needId: string): void {
  editingProduct.value = null
  showAddProduct.value = needId
}

function editProduct(product: SavedProduct): void {
  editingProduct.value = newEditingProduct(product)
  showAddProduct.value = null
}

async function saveNewProduct(needId: string): Promise<void> {
  const normalized = normalizeLinkSource(newProduct.url)
  if ('error' in normalized) {
    newProduct.urlError = normalized.error
    return
  }

  const input = {
    title: newProduct.title.trim(),
    platform: newProduct.platform.trim() || 'Lainnya',
    store_name: newProduct.storeName ?? undefined,
    url: normalized.url,
    price: newProduct.price ?? 0,
    pack_size: newProduct.packSize ?? 0,
    pack_unit: newProduct.packUnit,
    shipping_cost: newProduct.shippingCost ?? 0,
    voucher_discount: newProduct.voucherDiscount ?? 0,
    note: newProduct.note ?? undefined,
    price_checked_at: newProduct.priceCheckedAt
      ? `${newProduct.priceCheckedAt}:00`
      : new Date().toISOString(),
  }

  const result = await store.createNeedProduct(needId, input)
  if (result) {
    newProduct.title = ''
    newProduct.platform = ''
    newProduct.storeName = null
    newProduct.url = ''
    newProduct.urlError = null
    newProduct.price = null
    newProduct.packSize = null
    newProduct.packUnit = 'kg'
    newProduct.shippingCost = null
    newProduct.voucherDiscount = null
    newProduct.note = null
    newProduct.priceCheckedAt = formatDateInput(new Date().toISOString())
    showAddProduct.value = null
    await store.fetchProducts(needId)
    toastStore.success('Produk berhasil disimpan.')
  }
}

async function selectProduct(needId: string, productId: string | null): Promise<void> {
  await store.chooseNeedProduct(needId, productId)
}

async function removeSelectedNeed(id: string): Promise<void> {
  const ok = await store.removeNeedItem(id)
  if (ok) {
    if (activeNeedId.value === id) activeNeedId.value = null
    toastStore.success('Kebutuhan dihapus.')
  }
}

async function removeSelectedProduct(needId: string, id: string): Promise<void> {
  const ok = await store.removeNeedProduct(id, needId)
  if (ok) {
    await store.fetchProducts(needId)
    toastStore.success('Produk dihapus.')
  }
}

function confirmDelete(): void {
  if (!deleteOpen.value) return
  if (deleteOpen.value.isProduct && deleteOpen.value.needId) {
    void removeSelectedProduct(deleteOpen.value.needId, deleteOpen.value.id)
  } else {
    void removeSelectedNeed(deleteOpen.value.id)
  }
  deleteOpen.value = null
}

function openExamplePicker(): void {
  if (needs.value.length > 0) {
    toastStore.info('Contoh hanya diisi bila belum ada kebutuhan.')
    return
  }
  showExamplePicker.value = true
}

function closeExamplePicker(): void {
  showExamplePicker.value = false
}

async function isiContohKategori(index: number): Promise<void> {
  const kategori = EXAMPLE_CATEGORIES[index]
  if (!kategori) return

  const result = await store.createNeedItem({
    name: kategori.name,
    target_qty: kategori.target_qty,
    unit: kategori.unit,
  })
  if (!result) return

  const needId = result.id
  const now = new Date().toISOString()

  for (const produk of kategori.products) {
    await store.createNeedProduct(needId, {
      title: produk.title,
      platform: produk.platform,
      store_name: produk.store_name,
      url: produk.url,
      price: produk.price,
      pack_size: produk.pack_size,
      pack_unit: produk.pack_unit,
      shipping_cost: produk.shipping_cost,
      voucher_discount: produk.voucher_discount,
      note: produk.note,
      price_checked_at: now,
    })
  }

  await store.setMonthlyBudget(kategori.monthlyBudget)
  await store.fetchProducts(needId)
  activeNeedId.value = needId
  closeExamplePicker()
  toastStore.success(`Contoh "${kategori.name}" telah diisi.`)
}

function exportCsv(): void {
  const lines = ['Kebutuhan,Produk,Platform,Harga Efektif,Link']
  for (const need of needs.value) {
    if (!need.chosen_product_id) continue
    const product = productsFor(need.id).find((p) => p.id === need.chosen_product_id)
    if (!product) continue
    const efektif = hargaEfektifProduk({
      harga: product.price,
      ongkir: product.shipping_cost,
      voucher: product.voucher_discount,
    })
    const hargaEfektif = efektif.ok ? formatRupiah(efektif.value) : '-'
    const escape = (v: string) =>
      /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    lines.push(
      [
        escape(need.name),
        escape(product.title),
        escape(product.platform),
        hargaEfektif,
        escape(product.url),
      ].join(','),
    )
  }
  const csv = lines.join('\n')
  downloadCsv(`hematpintar-rumah-tangga-belanja-${fileDateStamp()}.csv`, csv)
  toastStore.success('CSV daftar belanja berhasil diunduh.')
}

function shareWhatsApp(): void {
  const items: { needName: string; productTitle: string; platform: string; hargaEfektif: number }[] = []
  let total = 0

  for (const need of needs.value) {
    if (!need.chosen_product_id) continue
    const product = productsFor(need.id).find((p) => p.id === need.chosen_product_id)
    if (!product) continue

    const efektif = hargaEfektifProduk({
      harga: product.price,
      ongkir: product.shipping_cost,
      voucher: product.voucher_discount,
    })
    if (!efektif.ok) continue

    items.push({
      needName: need.name,
      productTitle: product.title,
      platform: product.platform,
      hargaEfektif: efektif.value,
    })
    total += efektif.value
  }

  if (items.length === 0) {
    toastStore.info('Pilih minimal satu produk terpilih sebelum berbagi.')
    return
  }

  const message = buildWhatsAppBelanjaMessage(items, total)
  const url = buildWhatsAppUrl(import.meta.env.VITE_WA_NUMBER, message)

  if (!url) {
    toastStore.error('Nomor WhatsApp belum dikonfigurasi. Isi VITE_WA_NUMBER di .env.')
    return
  }

  window.open(url, '_blank')
  toastStore.success('Daftar belanja dibuka di WhatsApp.')
}

</script>

<template>
  <div class="space-y-8">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-medium text-primary-700">Akun wajib login</p>
          <StatusBadge label="Data disimpan ke akun Anda" tone="info" />
        </div>
        <h1 class="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Hemat Rumah Tangga
        </h1>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Susun daftar kebutuhan, bandingkan link produk dari platform, dan atur
          anggaran bulanan. Semua perhitungan harga dilakukan dari isian manual
          Anda.
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative inline-block">
          <button
            type="button"
            class="btn btn-secondary"
            @click="openExamplePicker"
          >
            Isi Contoh
          </button>
          <div
            v-if="showExamplePicker"
            class="absolute left-0 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg p-2 z-10"
          >
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 px-2">
              Pilih kategori
            </h4>
            <div class="space-y-1">
              <button
                v-for="(kategori, index) in EXAMPLE_CATEGORIES"
                :key="index"
                type="button"
                class="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg transition"
                @click="isiContohKategori(index)"
              >
                <span class="font-medium">{{ kategori.name }}</span>
                <span class="ml-auto text-xs text-slate-500">
                  {{ formatRupiah(kategori.monthlyBudget) }}
                </span>
              </button>
            </div>
            <button
              type="button"
              class="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg transition mt-1"
              @click="closeExamplePicker"
            >
              Batal
            </button>
          </div>
        </div>
        <button type="button" class="btn btn-primary" @click="showAddNeed = true">
          Tambah kebutuhan
        </button>
      </div>
    </header>

    <p class="rounded-lg border border-warning-200 bg-warning-50 p-4 text-sm text-warning-700" role="status">
      Harga diisi manual dan bisa berubah di platform. Cek ulang sebelum membeli.
      Ongkir bergantung lokasi dan voucher bergantung akun Anda.
    </p>

    <section class="card p-5" aria-labelledby="judul-anggaran-rumah-tangga">
      <h2 id="judul-anggaran-rumah-tangga" class="text-base font-semibold text-slate-900">
        Anggaran bulanan
      </h2>
      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <InputRupiah
          v-model="budgetInput"
          label="Anggaran bulanan"
          hint="Batas belanja per bulan."
          required
        />
        <button
          type="button"
          class="btn btn-primary"
          :disabled="store.loading"
          @click="store.setMonthlyBudget(budgetInput ?? 0)"
        >
          Simpan anggaran
        </button>
      </div>

      <p v-if="budget === null" class="mt-3 text-sm text-slate-500">
        Belum ada anggaran bulanan. Isi di atas untuk melihat persentase
        pemakaian.
      </p>
    </section>

    <section class="card p-5" aria-labelledby="judul-daftar-kebutuhan">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="judul-daftar-kebutuhan" class="text-base font-semibold text-slate-900">
            Daftar kebutuhan
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            Setiap kebutuhan boleh punya beberapa produk kandidat. Pilih satu
            produk terpilih per kebutuhan untuk dihitung ke total belanja.
          </p>
        </div>
      </div>

      <p v-if="needsLoading" class="text-sm text-slate-600" aria-live="polite">
        Memuat kebutuhan dari akun...
      </p>

      <div
        v-if="error"
        class="mt-3 rounded-lg border border-error-200 bg-error-50 p-3 text-sm text-error-700"
        role="alert"
      >
        {{ error ?? '' }}
        <button type="button" class="btn btn-secondary mt-3" @click="loadData">
          Coba lagi
        </button>
      </div>

      <div v-if="showAddNeed" class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <h4 class="text-sm font-semibold text-slate-900 mb-3">Buat kebutuhan baru</h4>
        <form class="grid gap-3 md:grid-cols-3" novalidate @submit.prevent="addNeed">
          <div>
            <label class="label-base">Nama kebutuhan</label>
            <input v-model="needName" type="text" class="input-base" required />
          </div>
          <div>
            <label class="label-base">Target jumlah</label>
            <input v-model.number="needTargetQty" type="number" class="input-base" min="0" step="0.01" />
          </div>
          <div>
            <label class="label-base">Satuan target</label>
            <InputSelectSatuan v-model="needUnit" label="" />
          </div>
          <div class="md:col-span-3 flex gap-2">
            <button type="button" class="btn btn-secondary" @click="showAddNeed = false">
              Batal
            </button>
            <button type="submit" class="btn btn-primary">Buat kebutuhan</button>
          </div>
        </form>
      </div>

      <div v-if="needs.length === 0 && !needsLoading" class="mt-6">
        <EmptyState
          title="Belum ada kebutuhan"
          description="Pilih contoh kategori untuk segera memulai, atau buat kebutuhan baru dari nol."
        >
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="(kategori, index) in EXAMPLE_CATEGORIES"
              :key="index"
              type="button"
              class="btn btn-secondary border flex-1 min-w-[140px]"
              @click="isiContohKategori(index)"
            >
              {{ kategori.name }}
            </button>
            <button
              type="button"
              class="btn btn-primary flex-1 min-w-[140px]"
              @click="showAddNeed = true"
            >
              Buat dari nol
            </button>
          </div>
        </EmptyState>
      </div>

      <div v-else class="mt-4 divide-y divide-slate-100">
        <div
          v-for="need in needs"
          :key="need.id"
          class="mt-6 rounded-lg border border-slate-200 bg-white p-5"
        >
          <div class="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 class="text-sm font-semibold text-slate-900 truncate max-w-[20rem]">
                {{ need.name }}
              </h3>
              <p v-if="need.target_qty && need.unit" class="mt-0.5 text-xs text-slate-500">
                Target {{ need.target_qty }} {{ need.unit }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <StatusBadge
                v-if="selectedProductId(need.id)"
                label="Produk terpilih"
                tone="success"
              />
              <button
                type="button"
                class="btn btn-secondary text-xs"
                @click="addProductToNeed(need.id)"
              >
                Tambah produk
              </button>
              <button
                type="button"
                class="btn btn-ghost text-error-700 hover:bg-error-50 text-xs"
                @click="
                  deleteOpen = { id: need.id, name: need.name }
                "
              >
                Hapus kebutuhan
              </button>
            </div>
          </div>

          <div v-if="productsLoading" class="mt-4 text-sm text-slate-600">
            Memuat produk...
          </div>

          <table v-else class="w-full text-sm mt-4">
            <thead>
              <tr class="border-b border-slate-200 text-left text-xs text-slate-500">
                <th class="pb-3">Produk</th>
                <th class="pb-3 text-right">Platform</th>
                <th class="pb-3 text-right">Harga Efektif</th>
                <th class="pb-3 text-right">Per Satuan</th>
                <th class="pb-3 text-right">Terpilih</th>
                <th class="pb-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr
                v-for="product in rankedProducts(need.id)"
                :key="product.id"
                class="group"
              >
                <td class="pb-3">
                  <div class="flex items-center gap-2">
                    <a
                      :href="product.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-primary-700 hover:underline font-medium truncate max-w-xs block"
                      :title="`${product.title} (${product.platform})`"
                    >
                      {{ product.title }}
                    </a>
                    <span class="ml-1 text-xs bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                      {{ product.platform }}
                    </span>
                    <p v-if="product.store_name" class="mt-0.5 text-xs text-slate-500 truncate max-w-xs">
                      {{ product.store_name }}
                    </p>
                    <p
                      v-if="product.note"
                      class="mt-0.5 text-xs text-slate-400 italic truncate max-w-xs"
                    >
                      {{ product.note }}
                    </p>
                    <p v-if="!product.segar" class="mt-0.5 text-xs text-warning-600 font-medium">
                      Harga dicek &gt; 7 hari lalu
                    </p>
                    <p
                      v-if="product.satuanTidakSebanding"
                      class="mt-0.5 text-xs text-error-600 font-medium"
                    >
                      Satuan tidak sebanding dengan produk lain
                    </p>
                  </div>
                </td>
                <td class="pb-3 text-right text-slate-600">
                  {{ formatRupiah(product.price) }}
                </td>
                <td class="pb-3 text-right">
                  <span
                    :class="
                      product.hargaEfektif !== null
                        ? 'font-medium'
                        : 'text-slate-400'
                    "
                  >
                    {{ product.hargaEfektif !== null ? formatRupiah(product.hargaEfektif) : '—' }}
                  </span>
                  <span
                    v-if="
                      product.shipping_cost ||
                      product.voucher_discount
                    "
                    class="ml-1 text-xs text-slate-400"
                  >
                    ({{
                      product.shipping_cost
                        ? `+${formatRupiah(product.shipping_cost)}`
                        : ''
                    }}
                    {{
                      product.voucher_discount
                        ? `-${formatRupiah(product.voucher_discount)}`
                        : ''
                    }})
                  </span>
                </td>
                <td class="pb-3 text-right">
                  <span v-if="product.hargaPerSatuan !== null" class="font-medium">
                    {{ formatRupiah(product.hargaPerSatuan) }}/
                    {{ product.satuanStandar }}
                  </span>
                  <span v-else class="text-slate-400">—</span>
                  <span
                    v-if="product.termurah"
                    class="ml-2 inline-flex items-center gap-1 rounded bg-success-50 text-success-700 px-2 py-0.5 text-xs font-semibold"
                  >
                    <svg class="h-3 w-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Termurah
                  </span>
                </td>
                <td class="pb-3 text-right">
                  <button
                    type="button"
                    class="btn btn-sm btn-ghost text-primary-700 hover:bg-primary-50"
                    :disabled="selectedProductId(need.id) === product.id"
                    @click="selectProduct(need.id, product.id)"
                  >
                    {{ selectedProductId(need.id) === product.id ? 'Terpilih' : 'Pilih ini' }}
                  </button>
                </td>
                <td class="pb-3 text-right">
                  <button
                    type="button"
                    class="btn btn-sm btn-ghost text-slate-600 hover:bg-slate-100"
                    @click="editProduct(product)"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-ghost text-error-700 hover:bg-error-50 ml-1"
                    @click="
                      deleteOpen = { id: product.id, name: product.title, needId: need.id, isProduct: true }
                    "
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            </tbody>
          </table>

          <p v-if="productsFor(need.id).length === 0" class="mt-4 text-sm text-slate-500">
            Belum ada produk kandidat. Tambahkan produk untuk membandingkan
            harga.
          </p>

          <div v-if="editingProduct?.need_id === need.id" class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 class="text-sm font-semibold text-slate-900 mb-3">Ubah produk</h4>
            <form class="grid gap-3 md:grid-cols-4" novalidate @submit.prevent="saveProduct(need.id)">
              <div>
                <label class="label-base">Nama produk</label>
                <input
                  v-model="editingProduct.editedTitle"
                  type="text"
                  class="input-base"
                  required
                />
              </div>
              <div>
                <label class="label-base">Platform</label>
                <input
                  v-model="editingProduct.editedTitle"
                  type="text"
                  class="input-base"
                  placeholder="Contoh: Shopee"
                />
                <p class="mt-0.5 text-xs text-slate-500">
                  Platform diambil dari nama/link; ubah sesuai keinginan.
                </p>
              </div>
              <div>
                <label class="label-base">Toko</label>
                <input
                  v-model="editingProduct.editedStoreName"
                  type="text"
                  class="input-base"
                  placeholder="Opsional"
                />
              </div>
              <div>
                <label class="label-base">Link produk</label>
                <input
                  v-model="editingProduct.editedUrl"
                  type="text"
                  class="input-base"
                  placeholder="https://..."
                  :class="{ 'border-error-500': Boolean(editingProduct.urlError) }"
                />
                <p v-if="editingProduct.urlError" class="mt-0.5 text-xs text-error-600" role="alert">
                  {{ editingProduct.urlError }}
                </p>
              </div>
              <div>
                <label class="label-base">Harga</label>
                <input
                  v-model.number="editingProduct.editedPrice"
                  type="number"
                  inputmode="numeric"
                  class="input-base"
                  min="0"
                  required
                />
              </div>
              <div class="flex items-end">
                <InputQty
                  v-model.number="editingProduct.editedPackSize"
                  label="Isi"
                  :satuan="editingProduct.editedPackUnit"
                  positive
                  required
                />
                <InputSelectSatuan
                  v-model="editingProduct.editedPackUnit"
                  label="Satuan isi"
                />
              </div>
              <div>
                <label class="label-base">Ongkir</label>
                <input
                  v-model.number="editingProduct.editedShippingCost"
                  type="number"
                  inputmode="numeric"
                  class="input-base"
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="label-base">Voucher</label>
                <input
                  v-model.number="editingProduct.editedVoucherDiscount"
                  type="number"
                  inputmode="numeric"
                  class="input-base"
                  min="0"
                  placeholder="0"
                />
              </div>
              <div>
                <label class="label-base">Catatan</label>
                <input
                  v-model="editingProduct.editedNote"
                  type="text"
                  class="input-base"
                  placeholder="Opsional"
                />
              </div>
              <div>
                <label class="label-base">Tanggal cek harga</label>
                <input
                  v-model="editingProduct.editedPriceCheckedAt"
                  type="datetime-local"
                  class="input-base"
                />
              </div>
              <div class="md:col-span-4 flex gap-2">
                <button
                  type="button"
                  class="btn btn-secondary"
                  @click="editingProduct = null"
                >
                  Batal
                </button>
                <button type="submit" class="btn btn-primary">Simpan perubahan</button>
              </div>
            </form>
          </div>

          <div v-if="showAddProduct === need.id" class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <h4 class="text-sm font-semibold text-slate-900 mb-3">Tambah produk kandidat</h4>
            <form class="grid gap-3 md:grid-cols-4" novalidate @submit.prevent="saveNewProduct(need.id)">
              <div>
                <label class="label-base">Nama produk</label>
                <input v-model="newProduct.title" type="text" class="input-base" required />
              </div>
              <div>
                <label class="label-base">Platform</label>
                <input v-model="newProduct.platform" type="text" class="input-base" placeholder="Shopee" />
              </div>
              <div>
                <label class="label-base">Toko</label>
                <input v-model="newProduct.storeName" type="text" class="input-base" placeholder="Opsional" />
              </div>
              <div>
                <label class="label-base">Link produk</label>
                <input v-model="newProduct.url" type="text" class="input-base" placeholder="https://..." required />
                <p v-if="newProduct.urlError" class="mt-0.5 text-xs text-error-600" role="alert">{{ newProduct.urlError }}</p>
              </div>
              <div>
                <label class="label-base">Harga</label>
                <input v-model.number="newProduct.price" type="number" inputmode="numeric" class="input-base" min="0" required />
              </div>
              <div class="flex items-end">
                <InputQty v-model.number="newProduct.packSize" label="Isi" :satuan="newProduct.packUnit" positive required />
                <InputSelectSatuan v-model="newProduct.packUnit" label="Satuan isi" />
              </div>
              <div>
                <label class="label-base">Ongkir</label>
                <input v-model.number="newProduct.shippingCost" type="number" inputmode="numeric" class="input-base" min="0" placeholder="0" />
              </div>
              <div>
                <label class="label-base">Voucher</label>
                <input v-model.number="newProduct.voucherDiscount" type="number" inputmode="numeric" class="input-base" min="0" placeholder="0" />
              </div>
              <div>
                <label class="label-base">Catatan</label>
                <input v-model="newProduct.note" type="text" class="input-base" placeholder="Opsional" />
              </div>
              <div>
                <label class="label-base">Tanggal cek harga</label>
                <input v-model="newProduct.priceCheckedAt" type="datetime-local" class="input-base" />
              </div>
              <div class="md:col-span-4 flex gap-2">
                <button type="button" class="btn btn-secondary" @click="showAddProduct = null">Batal</button>
                <button type="submit" class="btn btn-primary">Simpan produk</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="card p-5" aria-labelledby="judul-ringkasan">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="judul-ringkasan" class="text-base font-semibold text-slate-900">
          Ringkasan belanja terpilih
        </h2>
        <button type="button" class="btn btn-secondary" @click="exportCsv">
          Ekspor CSV
        </button>
        <button type="button" class="btn btn-primary" @click="shareWhatsApp">
          Share WhatsApp
        </button>
      </div>
      <div class="mt-4 grid gap-4 md:grid-cols-4">
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-500">Total terpilih</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{ formatRupiah(selectedTotal()) }}
          </p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-500">Sisa / kelebihan</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{
              budget && budget.monthly_budget !== null
                ? formatRupiah(budget.monthly_budget - selectedTotal())
                : '—'
            }}
          </p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-500">Persen terpakai</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{
              budget && budget.monthly_budget > 0
                ? formatPercent(selectedTotal() / budget.monthly_budget)
                : 'Tidak tersedia'
            }}
          </p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-white p-4">
          <p class="text-xs text-slate-500">Penghematan vs termahal</p>
          <p class="mt-1 text-lg font-semibold text-slate-900">
            {{ formatRupiah(penghematanDariTermahal()) }}
          </p>
        </div>
      </div>

      <p class="mt-4 text-sm text-slate-600">
        Pengematan dihitung per kebutuhan: selisih harga produk termahal (yang
        tidak dipilih) dengan produk yang Anda pilih, dengan asumsi kualitas dan
        jumlah dianggap setara. Hasil ini adalah estimasi, bukan jaminan.
      </p>
    </section>

    <ConfirmDialog
      v-if="deleteOpen"
      :open="true"
      :title="deleteOpen.isProduct ? 'Hapus produk?' : 'Hapus kebutuhan?'"
      :message="
        `Yakin ingin menghapus ${deleteOpen.name}? Data yang dihapus tidak dapat dikembalikan.`
      "
      confirm-label="Hapus"
      cancel-label="Batal"
      tone="danger"
      @update:open="deleteOpen = null"
      @confirm="confirmDelete"
    />
  </div>
</template>