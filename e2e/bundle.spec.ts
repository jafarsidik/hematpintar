import { expect, test } from '@playwright/test'

test('Generator Paket Hemat: contoh, hitung, simpan, muat ulang, dan validasi', async ({
  page,
}) => {
  await page.goto('/paket-hemat')

  await page.getByRole('button', { name: 'Isi contoh' }).click()

  await expect(page.getByLabel('Nama paket')).toHaveValue(
    'Paket Hemat Keripik dan Sambal',
  )
  await expect(page.getByTestId('harga-normal-paket')).toContainText('31.000')
  await expect(page.getByTestId('total-biaya-paket')).toContainText('24.000')
  await expect(page.getByTestId('diskon-nominal')).toContainText('4.000')
  await expect(page.getByTestId('diskon-persen')).toContainText('12,9%')
  await expect(page.getByTestId('laba-paket')).toContainText('2.000')
  await expect(page.getByTestId('margin-paket')).toContainText('7,41%')
  await expect(page.getByTestId('harga-minimum-paket')).toContainText('27.778')
  await expect(page.getByTestId('diskon-maksimum')).toContainText('3.222')
  await expect(page.getByTestId('status-paket')).toContainText(
    'Di bawah target',
  )

  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  await page.reload()

  await expect(page.getByLabel('Nama paket')).toHaveValue(
    'Paket Hemat Keripik dan Sambal',
  )
  await expect(page.getByTestId('harga-normal-paket')).toContainText('31.000')
  await expect(page.getByTestId('total-biaya-paket')).toContainText('24.000')
  await expect(page.getByTestId('laba-paket')).toContainText('2.000')
  await expect(page.getByTestId('margin-paket')).toContainText('7,41%')
  await expect(page.getByTestId('status-paket')).toContainText(
    'Di bawah target',
  )

  const targetMargin = page.getByLabel('Target margin (%)')
  await targetMargin.fill('100')
  await targetMargin.blur()

  await expect(
    page.getByText('Persentase harus antara 0 dan 99,99.'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(
    page.getByText('Periksa input yang ditandai sebelum menyimpan.'),
  ).toBeVisible()
})

test('Generator Paket Hemat: edit, duplikat, CSV, dan reset terkonfirmasi', async ({
  page,
}) => {
  await page.goto('/paket-hemat')
  await page.getByRole('button', { name: 'Isi contoh' }).click()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  const bundlePrice = page.getByLabel('Harga jual paket')
  await bundlePrice.fill('30000')
  await bundlePrice.blur()
  await expect(page.getByTestId('status-paket')).toContainText('Sesuai target')

  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(
    page.getByText('Perubahan simulasi berhasil disimpan.'),
  ).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Harga jual paket')).toHaveValue('30.000')
  await expect(page.getByTestId('status-paket')).toContainText('Sesuai target')

  await page.getByRole('button', { name: 'Duplikat' }).click()
  await expect(
    page.getByText('Simulasi diduplikasi. Anda sedang membuka salinannya.'),
  ).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Ekspor CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(
    /^hematpintar-paket-hemat-\d{4}-\d{2}-\d{2}\.csv$/,
  )

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('Reset form?')).toBeVisible()
  await page.getByRole('button', { name: 'Reset form' }).click()

  await expect(page.getByLabel('Nama paket')).toHaveValue('')
  await expect(page).not.toHaveURL(/simulation=/)
})
