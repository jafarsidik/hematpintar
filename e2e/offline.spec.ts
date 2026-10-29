import { expect, test } from '@playwright/test'

test('kalkulator tetap berjalan offline setelah aset PWA tersedia', async ({
  page,
  context,
}) => {
  await page.goto('/')
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })

  await context.setOffline(true)
  await page.goto('/rumah-tangga')

  await page.getByRole('button', { name: 'Isi contoh' }).click()
  await expect(page.getByTestId('total-belanja')).toContainText('134.000')
  await expect(page.getByTestId('status-anggaran')).toContainText(
    'Dalam anggaran',
  )

  await context.setOffline(false)
})
