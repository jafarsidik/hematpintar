import { expect, test } from '@playwright/test'

test('Hemat Rumah Tangga: contoh, angka acuan, simpan, muat ulang, dan validasi', async ({
  page,
}) => {
  await page.goto('/rumah-tangga')

  await page.getByRole('button', { name: 'Isi contoh' }).click()

  await expect(page.getByTestId('total-belanja')).toContainText('134.000')
  await expect(page.getByTestId('sisa-anggaran')).toContainText('66.000')
  await expect(page.getByTestId('persen-anggaran')).toContainText('67%')
  await expect(page.getByTestId('baseline-total')).toContainText('143.000')
  await expect(page.getByTestId('alternatif-total')).toContainText('134.000')
  await expect(page.getByTestId('penghematan')).toContainText('9.000')
  await expect(page.getByTestId('harga-satuan')).toContainText('24.000/kg')
  await expect(page.getByTestId('status-anggaran')).toContainText(
    'Dalam anggaran',
  )

  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  await page.reload()

  await expect(page.getByLabel('Anggaran belanja')).toHaveValue('200.000')
  await expect(page.getByTestId('total-belanja')).toContainText('134.000')
  await expect(page.getByTestId('sisa-anggaran')).toContainText('66.000')
  await expect(page.getByTestId('baseline-total')).toContainText('143.000')
  await expect(page.getByTestId('penghematan')).toContainText('9.000')
  await expect(page.getByTestId('harga-satuan')).toContainText('24.000/kg')
  await expect(page.getByTestId('status-anggaran')).toContainText(
    'Dalam anggaran',
  )

  const budget = page.getByLabel('Anggaran belanja')
  await budget.fill('')
  await budget.blur()

  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(
    page.getByText('Periksa input yang ditandai sebelum menyimpan.'),
  ).toBeVisible()
  await expect(
    page.getByText('Anggaran belanja wajib diisi dalam Rupiah bulat.').first(),
  ).toBeVisible()
})

test('Hemat Rumah Tangga: edit, duplikat, CSV, dan reset terkonfirmasi', async ({
  page,
}) => {
  await page.goto('/rumah-tangga')
  await page.getByRole('button', { name: 'Isi contoh' }).click()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()

  const budget = page.getByLabel('Anggaran belanja')
  await budget.fill('300000')
  await budget.blur()

  await expect(page.getByTestId('persen-anggaran')).toContainText('44,67%')

  await page.getByRole('button', { name: 'Simpan perubahan' }).click()
  await expect(
    page.getByText('Perubahan simulasi berhasil disimpan.'),
  ).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Anggaran belanja')).toHaveValue('300.000')
  await expect(page.getByTestId('persen-anggaran')).toContainText('44,67%')

  await page.getByRole('button', { name: 'Duplikat' }).click()
  await expect(
    page.getByText('Simulasi diduplikasi. Anda sedang membuka salinannya.'),
  ).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Ekspor CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(
    /^hematpintar-rumah-tangga-\d{4}-\d{2}-\d{2}\.csv$/,
  )

  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await expect(page.getByText('Reset form?')).toBeVisible()
  await page.getByRole('button', { name: 'Reset form' }).click()

  await expect(page.getByLabel('Anggaran belanja')).toHaveValue('')
  await expect(page).not.toHaveURL(/simulation=/)
})
