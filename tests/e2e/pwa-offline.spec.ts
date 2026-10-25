import { expect, test } from '@playwright/test'

test('caches the app shell and preserves workout edits offline through reload', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Build the silhouette/ })).toBeVisible()
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(async () => {
    const cacheName = (await caches.keys()).find((key) => key.startsWith('v-taper-shell-'))
    if (!cacheName) return false
    const cache = await caches.open(cacheName)
    const appScript = document.querySelector<HTMLScriptElement>('script[type="module"][src]')?.src
    return appScript ? Boolean(await cache.match(appScript)) : false
  })).toBe(true)
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await page.getByRole('button', { name: 'Train', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Neutral-grip lat pulldown set 1 weight' }).fill('71')
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: /Build the silhouette/ })).toBeVisible()
  await expect(page.getByText(/Offline.*changes pending locally/i)).toBeVisible()
  await page.getByRole('button', { name: 'Train', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'Neutral-grip lat pulldown set 1 weight' })).toHaveValue('71')
  await page.getByRole('button', { name: 'Mark set 1 complete', exact: true }).first().click()
  await expect(page.getByText(/Saved on this device.*pending sync/i)).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Train', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'Neutral-grip lat pulldown set 1 weight' })).toHaveValue('71')
  await expect(page.getByText('1/14 sets complete')).toBeVisible()

  await context.setOffline(false)
  await expect(page.getByText(/Online.*1 changes pending locally.*cloud sync not connected/i)).toBeVisible()
})

test('serves manifest and shell assets with expected install metadata', async ({ page, request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest')
  expect(manifestResponse.ok()).toBeTruthy()
  const manifest = await manifestResponse.json() as { display: string; icons: Array<{ src: string; purpose: string }> }
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.some((icon) => icon.src === '/icons/icon.svg' && icon.purpose.includes('maskable'))).toBeTruthy()
  expect((await request.get('/icons/icon.svg')).ok()).toBeTruthy()
  expect((await request.get('/sw.js')).ok()).toBeTruthy()
  await page.goto('/')
  await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeVisible()
})

test('exposes the Supabase sign-in form when Marketplace public variables are present', async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'The Vercel Production public variables are not present in this environment.')
  await page.goto('/')
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Connect your account' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})

test('Marketplace public variables expose the sign-in UI without server credentials', async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, 'Production public Supabase variables are not present in this environment.')
  await page.goto('/')
  await page.getByRole('button', { name: 'Profile', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Connect your account' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
})
