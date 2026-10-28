import { expect, test } from '@playwright/test'

test('Margin Rescue: contoh, hitung, simpan, muat ulang, dan validasi', async ({
  page,
}) => {
  await page.goto('/margin-rescue')

  await page.getByRole('button', { name: 'Isi contoh' }).click()

  await expect(page.getByLabel('Nama produk')).toHaveValue('Ayam Goreng')
  await expect(page.getByTestId('total-biaya-batch')).toContainText('40.000')
  await expect(page.getByTestId('hpp-per-unit')).toContainText('4.000')
  await expect(page.getByTestId('harga-minimum')).toContainText('5.000')
  await expect(page.getByTestId('margin-aktual')).toContainText('20%')
  await expect(page.getByTestId('markup')).toContainText('25%')
  await expect(page.getByTestId('laba-kontribusi')).toContainText('1.000')
  await expect(page.getByTestId('break-even-unit')).toContainText('100 unit')
  await expect(page.getByTestId('status-margin')).toContainText('Sehat')

  const perubahanBahan = page.getByLabel('Simulasi perubahan harga bahan (%)')
  await perubahanBahan.fill('10')
  await perubahanBahan.blur()

  await expect(page.getByTestId('simulasi-hpp')).toContainText('4.340')
  await expect(page.getByTestId('simulasi-harga-minimum')).toContainText(
    '5.425',
  )

  await perubahanBahan.fill('-10')
  await perubahanBahan.blur()

  await expect(page.getByTestId('simulasi-hpp')).toContainText('3.660')
  await expect(page.getByTestId('simulasi-harga-minimum')).toContainText(
    '4.575',
  )

  await perubahanBahan.fill('10')
  await perubahanBahan.blur()

  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  await page.reload()

  await expect(page.getByLabel('Nama produk')).toHaveValue('Ayam Goreng')
  await expect(page.getByTestId('hpp-per-unit')).toContainText('4.000')
  await expect(page.getByTestId('margin-aktual')).toContainText('20%')
  await expect(page.getByTestId('simulasi-hpp')).toContainText('4.340')
  await expect(
    page.getByLabel('Simulasi perubahan harga bahan (%)'),
  ).toHaveValue('10')

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

test('Margin Rescue: edit, duplikat, CSV, dan reset terkonfirmasi', async ({
  page,
}) => {
  await page.goto('/margin-rescue')
  await page.getByRole('button', { name: 'Isi contoh' }).click()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  const hargaSaatIni = page.getByLabel('Harga jual saat ini (opsional)')
  await hargaSaatIni.fill('4800')
  await hargaSaatIni.blur()
  await expect(page.getByTestId('status-margin')).toContainText(
    'Di bawah target',
  )

  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(
    page.getByText('Perubahan simulasi berhasil disimpan.'),
  ).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Harga jual saat ini (opsional)')).toHaveValue(
    '4.800',
  )
  await expect(page.getByTestId('status-margin')).toContainText(
    'Di bawah target',
  )

  await page.getByRole('button', { name: 'Duplikat' }).click()
  await expect(
    page.getByText('Simulasi diduplikasi. Anda sedang membuka salinannya.'),
  ).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Ekspor CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(
    /^hematpintar-margin-\d{4}-\d{2}-\d{2}\.csv$/,
  )

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('Reset form?')).toBeVisible()
  await page.getByRole('button', { name: 'Reset form' }).click()

  await expect(page.getByLabel('Nama produk')).toHaveValue('')
  await expect(page).not.toHaveURL(/simulation=/)
})
