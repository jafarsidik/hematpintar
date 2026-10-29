import { expect, test } from '@playwright/test'

test('Profit Kit Reseller: contoh, hitung, simpan, muat ulang, dan validasi', async ({
  page,
}) => {
  await page.goto('/reseller')

  await page.getByRole('button', { name: 'Isi contoh' }).click()

  await expect(page.getByLabel('Nama produk')).toHaveValue('Kaos Katun')
  await expect(page.getByLabel('Harga jual')).toHaveValue('150.000')
  await expect(page.getByLabel('Diskon penjual')).toHaveValue('10.000')
  await expect(page.getByLabel('Cadangan refund')).toHaveValue('0')
  await expect(page.getByLabel('Biaya barang per unit')).toHaveValue('80.000')
  await expect(page.getByLabel('Tarif platform (%)')).toHaveValue('8')
  await expect(page.getByLabel('Dasar komisi platform')).toHaveValue(
    'harga_setelah_diskon',
  )
  await expect(page.getByLabel('Biaya pembayaran')).toHaveValue('2.000')
  await expect(page.getByLabel('Biaya kemasan')).toHaveValue('3.000')
  await expect(page.getByLabel('Subsidi ongkir penjual')).toHaveValue('4.800')
  await expect(page.getByLabel('Biaya iklan per pesanan')).toHaveValue('4.000')
  await expect(page.getByLabel('Biaya lain')).toHaveValue('0')
  await expect(page.getByLabel('Volume pesanan')).toHaveValue('50')

  await expect(page.getByTestId('pendapatan-bersih')).toContainText('140.000')
  await expect(page.getByTestId('biaya-platform')).toContainText('11.200')
  await expect(page.getByTestId('total-biaya-variabel')).toContainText('105.000')
  await expect(page.getByTestId('laba-per-pesanan')).toContainText('35.000')
  await expect(page.getByTestId('margin-reseller')).toContainText('25%')
  await expect(page.getByTestId('laba-volume')).toContainText('1.750.000')
  await expect(page.getByTestId('status-reseller')).toContainText('Untung')

  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  await page.reload()

  await expect(page.getByLabel('Nama produk')).toHaveValue('Kaos Katun')
  await expect(page.getByLabel('Harga jual')).toHaveValue('150.000')
  await expect(page.getByLabel('Dasar komisi platform')).toHaveValue(
    'harga_setelah_diskon',
  )
  await expect(page.getByTestId('pendapatan-bersih')).toContainText('140.000')
  await expect(page.getByTestId('biaya-platform')).toContainText('11.200')
  await expect(page.getByTestId('total-biaya-variabel')).toContainText('105.000')
  await expect(page.getByTestId('laba-per-pesanan')).toContainText('35.000')
  await expect(page.getByTestId('margin-reseller')).toContainText('25%')
  await expect(page.getByTestId('laba-volume')).toContainText('1.750.000')
  await expect(page.getByTestId('status-reseller')).toContainText('Untung')

  const diskon = page.getByLabel('Diskon penjual')
  await diskon.fill('200000')
  await diskon.blur()

  await expect(
    page.getByText(/Diskon dan refund melebihi harga jual/).first(),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(
    page.getByText('Periksa input yang ditandai sebelum menyimpan.'),
  ).toBeVisible()
})

test('Profit Kit Reseller: edit, duplikat, CSV, dan reset terkonfirmasi', async ({
  page,
}) => {
  await page.goto('/reseller')
  await page.getByRole('button', { name: 'Isi contoh' }).click()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  const hargaJual = page.getByLabel('Harga jual')
  await hargaJual.fill('160000')
  await hargaJual.blur()
  await expect(page.getByTestId('pendapatan-bersih')).toContainText('150.000')
  await expect(page.getByTestId('laba-per-pesanan')).toContainText('44.200')

  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(
    page.getByText('Perubahan simulasi berhasil disimpan.'),
  ).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Harga jual')).toHaveValue('160.000')
  await expect(page.getByTestId('pendapatan-bersih')).toContainText('150.000')

  await page.getByRole('button', { name: 'Duplikat' }).click()
  await expect(
    page.getByText('Simulasi diduplikasi. Anda sedang membuka salinannya.'),
  ).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Ekspor CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(
    /^hematpintar-reseller-\d{4}-\d{2}-\d{2}\.csv$/,
  )

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('Reset form?')).toBeVisible()
  await page.getByRole('button', { name: 'Reset form' }).click()

  await expect(page.getByLabel('Nama produk')).toHaveValue('')
  await expect(page).not.toHaveURL(/simulation=/)
})
