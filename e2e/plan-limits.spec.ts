import { expect, test, type Page } from '@playwright/test'

async function saveHouseholdExample(page: Page): Promise<void> {
  await page.goto('/rumah-tangga')
  await page.getByRole('button', { name: 'Isi contoh' }).click()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
}

test('batas Free tercapai, data lama tetap ada, dan premium tidak terbuka lewat browser', async ({
  page,
}) => {
  test.setTimeout(90_000)

  for (let index = 0; index < 5; index += 1) {
    await saveHouseholdExample(page)
    await expect(page.getByText('Simulasi berhasil disimpan.')).toBeVisible()
  }

  await saveHouseholdExample(page)
  await expect(page.getByText('Batas simulasi tercapai')).toBeVisible()
  await expect(page.getByText(/Batas paket Free/)).toBeVisible()
  await expect(page.getByText(/Data lama tetap aman/)).toBeVisible()
  await page.getByRole('button', { name: 'Nanti' }).click()

  await page.goto('/riwayat')
  await expect(page.getByText('5 simulasi ditampilkan')).toBeVisible()

  // Parameter URL dan localStorage bukan sumber entitlement.
  await page.evaluate(() => {
    localStorage.setItem('plan', 'plus')
    localStorage.setItem('hematpintar.plan', 'plus')
  })
  await page.goto('/rumah-tangga?plan=plus')
  await page.getByRole('button', { name: 'Isi contoh' }).click()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Batas simulasi tercapai')).toBeVisible()

  await page.goto('/pricing?plan=plus')
  await expect(page.getByTestId('paket-efektif')).toContainText('Free')
})
