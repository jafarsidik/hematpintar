import { expect, test } from '@playwright/test'

test('halaman harga menampilkan paket, batas, dan ketentuan lisensi', async ({
  page,
}) => {
  await page.goto('/pricing')

  await expect(
    page.getByRole('heading', { name: 'Rencana paket HematPintar' }),
  ).toBeVisible()
  await expect(page.getByTestId('paket-efektif')).toContainText('Free')

  await expect(page.getByTestId('paket-free')).toContainText(
    '5 simulasi per modul',
  )
  await expect(page.getByTestId('paket-plus')).toContainText('39.000')
  await expect(page.getByTestId('paket-plus')).toContainText(
    '50 simulasi per modul',
  )
  await expect(page.getByTestId('paket-business')).toContainText('99.000')
  await expect(page.getByTestId('paket-business')).toContainText(
    'Simulasi tanpa batas',
  )

  await expect(
    page.getByText(/Lisensi sekali bayar berlaku untuk versi mayor/),
  ).toBeVisible()
  await expect(
    page.getByText(/tidak pernah menampilkan status/i),
  ).toBeVisible()
  await expect(page.getByText(/Pembayaran dan aktivasi paket/)).toBeVisible()
})
