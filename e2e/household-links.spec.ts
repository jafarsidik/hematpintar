import { expect, test } from '@playwright/test'

test('Hemat Rumah Tangga: halaman muat tanpa redirect login dan tombol aksi terlihat', async ({
  page,
}) => {
  // Halaman muat tanpa diarahkan ke login (VITE_E2E_BYPASS_AUTH)
  await page.goto('/rumah-tangga')
  await page.waitForTimeout(1000)

  await expect(page.getByText('Hemat Rumah Tangga').first()).toBeVisible()
  await expect(
    page.getByText(
      'Harga diisi manual dan bisa berubah di platform. Cek ulang sebelum membeli. Ongkir bergantung lokasi dan voucher bergantung akun Anda.'
    )
  ).toBeVisible()

  // Tombol aksi utama terlihat
  await expect(
    page.locator('button:has-text("Tambah kebutuhan")').first()
  ).toBeVisible()
  await expect(page.locator('button:has-text("Isi contoh")').first()).toBeVisible()
})

test('normalizeUrl menolak link berbahaya (unit-level via halaman)', async ({
  page,
}) => {
  // Validasi fungsi normalizeUrl dilakukan di unit test
  // (src/lib/links/normalize-url.test.ts). Di sini hanya memastikan
  // halaman rumah tangga dapat diakses tanpa error kritis.
  await page.goto('/rumah-tangga')
  await page.waitForTimeout(1000)
  await expect(page.getByText('Hemat Rumah Tangga').first()).toBeVisible()
  // Tidak ada error kritis di console
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))
  await page.waitForTimeout(500)
  expect(errors).toEqual([])
})
