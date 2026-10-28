import { z } from 'zod'

export const MODULE_TYPES = ['household', 'margin', 'reseller', 'bundle'] as const
export type ModuleType = (typeof MODULE_TYPES)[number]

export const SCHEMA_VERSION = 1

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const uuidSchema = z
  .string({ error: 'ID wajib diisi.' })
  .regex(UUID_PATTERN, 'ID harus berupa UUID yang valid.')

const moneySchema = z
  .number({ error: 'Nilai uang wajib diisi dengan angka.' })
  .int('Nilai uang harus berupa Rupiah bulat.')
  .min(0, 'Nilai uang tidak boleh negatif.')

const qtySchema = z
  .number({ error: 'Kuantitas wajib diisi dengan angka.' })
  .positive('Kuantitas harus lebih besar dari 0.')

const percentSchema = z
  .number({ error: 'Persentase wajib diisi dengan angka.' })
  .min(0, 'Persentase tidak boleh negatif.')
  .max(1, 'Persentase tidak boleh lebih dari 100%.')

const targetMarginSchema = z
  .number({ error: 'Target margin wajib diisi dengan angka.' })
  .min(0, 'Target margin tidak boleh negatif.')
  .refine(
    (value) => value < 1,
    'Target margin harus kurang dari 100%; gunakan 0,3 untuk 30%.',
  )

const namaSchema = z
  .string({ error: 'Nama wajib diisi.' })
  .trim()
  .min(1, 'Nama minimal 1 karakter.')
  .max(120, 'Nama maksimal 120 karakter.')

const teksSchema = z.string({ error: 'Teks wajib diisi.' })

const satuanSchema = z.enum(['g', 'kg', 'ml', 'l', 'pcs'], {
  error: 'Satuan harus salah satu dari g, kg, ml, l, atau pcs.',
})

const tanggalSchema = z
  .string({ error: 'Tanggal wajib diisi.' })
  .min(1, 'Tanggal wajib diisi.')

const householdItemSchema = z.object({
  nama: z
    .string({ error: 'Nama barang wajib diisi.' })
    .trim()
    .min(1, 'Nama barang minimal 1 karakter.'),
  kuantitas: qtySchema,
  satuan: satuanSchema,
  harga: moneySchema,
})

export const householdPayloadSchema = z.object({
  budget: moneySchema,
  items: z.array(householdItemSchema),
  baselineItems: z.array(householdItemSchema),
  alternativeItems: z.array(householdItemSchema),
  notes: teksSchema,
})
export type HouseholdPayload = z.infer<typeof householdPayloadSchema>

const ingredientSchema = z.object({
  nama: z
    .string({ error: 'Nama bahan wajib diisi.' })
    .trim()
    .min(1, 'Nama bahan minimal 1 karakter.'),
  kuantitas: qtySchema,
  hargaPerSatuan: moneySchema,
})

export const marginPayloadSchema = z.object({
  productName: z
    .string({ error: 'Nama produk wajib diisi.' })
    .trim()
    .min(1, 'Nama produk minimal 1 karakter.'),
  batchYield: qtySchema,
  ingredients: z.array(ingredientSchema),
  packagingCost: moneySchema,
  directLaborCost: moneySchema,
  allocatedOverhead: moneySchema,
  sellingPrice: moneySchema,
  targetMargin: targetMarginSchema,
})
export type MarginPayload = z.infer<typeof marginPayloadSchema>

export const resellerPayloadSchema = z.object({
  productName: z
    .string({ error: 'Nama produk wajib diisi.' })
    .trim()
    .min(1, 'Nama produk minimal 1 karakter.'),
  sellingPrice: moneySchema,
  discount: moneySchema,
  refundAllowance: moneySchema,
  unitCost: moneySchema,
  platformFeeRate: percentSchema,
  platformFeeBase: z.enum(
    ['harga_sebelum_diskon', 'harga_setelah_diskon', 'pendapatan_bersih'],
    { error: 'Dasar komisi tidak dikenali.' },
  ),
  paymentFee: moneySchema,
  packagingCost: moneySchema,
  sellerShippingSubsidy: moneySchema,
  adCostPerOrder: moneySchema,
  otherCosts: moneySchema,
  orderVolume: z
    .number({ error: 'Volume pesanan wajib diisi dengan angka.' })
    .int('Volume pesanan harus bilangan bulat.')
    .positive('Volume pesanan harus lebih besar dari 0.'),
})
export type ResellerPayload = z.infer<typeof resellerPayloadSchema>

const bundleItemSchema = z.object({
  productId: z.string().min(1).optional(),
  nama: z
    .string({ error: 'Nama produk paket wajib diisi.' })
    .trim()
    .min(1, 'Nama produk paket minimal 1 karakter.'),
  kuantitas: qtySchema,
  biaya: moneySchema,
  hargaNormal: moneySchema,
})

export const bundlePayloadSchema = z.object({
  bundleName: z
    .string({ error: 'Nama paket wajib diisi.' })
    .trim()
    .min(1, 'Nama paket minimal 1 karakter.'),
  items: z.array(bundleItemSchema),
  extraPackagingCost: moneySchema,
  extraVariableSellingCost: moneySchema,
  bundlePrice: moneySchema,
  targetMargin: targetMarginSchema,
})
export type BundlePayload = z.infer<typeof bundlePayloadSchema>

const simulationBaseShape = {
  id: uuidSchema,
  name: namaSchema,
  createdAt: tanggalSchema,
  updatedAt: tanggalSchema,
  schemaVersion: z
    .number({ error: 'Versi skema wajib diisi.' })
    .int()
    .refine(
      (value) => value === SCHEMA_VERSION,
      `Versi skema tidak didukung; versi saat ini ${SCHEMA_VERSION}.`,
    ),
}

export const simulationSchema = z.discriminatedUnion('moduleType', [
  z.object({
    ...simulationBaseShape,
    moduleType: z.literal('household'),
    payload: householdPayloadSchema,
  }),
  z.object({
    ...simulationBaseShape,
    moduleType: z.literal('margin'),
    payload: marginPayloadSchema,
  }),
  z.object({
    ...simulationBaseShape,
    moduleType: z.literal('reseller'),
    payload: resellerPayloadSchema,
  }),
  z.object({
    ...simulationBaseShape,
    moduleType: z.literal('bundle'),
    payload: bundlePayloadSchema,
  }),
])

export const settingsSchema = z.object({
  id: z.string({ error: 'ID pengaturan wajib diisi.' }).min(1),
  currency: z.literal('IDR'),
  locale: z.literal('id-ID'),
  theme: z.enum(['system', 'light', 'dark'], {
    error: 'Tema harus system, light, atau dark.',
  }),
  onboardingCompleted: z.boolean(),
})
export type SettingsRecord = z.infer<typeof settingsSchema>

export const productSchema = z.object({
  id: uuidSchema,
  name: z
    .string({ error: 'Nama produk wajib diisi.' })
    .trim()
    .min(1, 'Nama produk minimal 1 karakter.'),
  unit: satuanSchema,
  costPerUnit: moneySchema,
  sellingPrice: moneySchema,
  category: z
    .string({ error: 'Kategori wajib diisi.' })
    .trim()
    .min(1, 'Kategori minimal 1 karakter.'),
  createdAt: tanggalSchema,
  updatedAt: tanggalSchema,
})
export type ProductRecord = z.infer<typeof productSchema>

/**
 * Tipe penyimpanan memakai payload `unknown`; bentuk sebenarnya selalu
 * divalidasi dengan `simulationSchema` sebelum ditulis.
 */
export interface SimulationRecord {
  id: string
  moduleType: ModuleType
  name: string
  payload: unknown
  createdAt: string
  updatedAt: string
  schemaVersion: number
}

export const backupSchema = z
  .object({
    format: z.literal('hematpintar-backup', {
      error: 'Berkas ini bukan backup HematPintar.',
    }),
    version: z
      .number({ error: 'Versi backup wajib diisi.' })
      .int()
      .refine(
        (value) => value === SCHEMA_VERSION,
        `Versi backup tidak didukung; versi saat ini ${SCHEMA_VERSION}.`,
      ),
    exportedAt: tanggalSchema,
    settings: z.array(settingsSchema),
    products: z.array(productSchema),
    simulations: z.array(simulationSchema),
  })
  .superRefine((data, context) => {
    const ids = new Set<string>()
    data.simulations.forEach((simulation, index) => {
      if (ids.has(simulation.id)) {
        context.addIssue({
          code: 'custom',
          path: ['simulations', index, 'id'],
          message:
            'ID simulasi duplikat di dalam backup; perbaiki berkas sebelum mengimpor.',
        })
      }
      ids.add(simulation.id)
    })
  })

export type BackupData = z.infer<typeof backupSchema>
