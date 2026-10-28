const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

/**
 * Temporary display helper. Not a financial calculation.
 */
export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value)
}
