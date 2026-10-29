import { expect, test } from '@playwright/test'

test('fitur premium ditolak tanpa entitlement dari akun', async ({ page }) => {
  await page.goto('/reseller')

  await expect(
    page.getByRole('heading', { name: 'Perbandingan produk' }),
  ).toBeVisible()
  await expect(page.getByText('Fitur paket Plus')).toBeVisible()
  await expect(
    page.getByText(/Perbandingan produk tersimpan tersedia di paket Plus/),
  ).toBeVisible()
  await expect(page.locator('table')).toHaveCount(0)

  // Mencoba membuka premium lewat URL dan localStorage tidak mengubah paket.
  await page.evaluate(() => {
    localStorage.setItem('plan', 'plus')
    localStorage.setItem('hematpintar.plan', 'plus')
    localStorage.setItem('entitlement', 'business')
  })
  await page.goto('/reseller?plan=plus')
  await expect(page.getByText('Fitur paket Plus')).toBeVisible()
  await expect(page.locator('table')).toHaveCount(0)

  await page.goto('/pricing?plan=plus')
  await expect(page.getByTestId('paket-efektif')).toContainText('Free')
})
