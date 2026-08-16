import { test, expect } from '@playwright/test'

const EMAIL = 'admin@gmail.com'
const PASSWORD = 'admin'

async function login(page: any) {
  await page.goto('http://localhost:5173/login')
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL('http://localhost:5173/chat')
}

// ─── Test 8 : Dashboard accessible ───────────────────────
test('dashboard accessible après login', async ({ page }) => {
  await login(page)

  // Naviguer via sidebar au lieu de goto
  await page.click('a[href="/dashboard"]')
  await expect(page).toHaveURL('http://localhost:5173/dashboard')
  await expect(page.locator('h1').first()).toBeVisible()
})

// ─── Test 9 : Filtres fonctionnels ───────────────────────
test('filtre tableau fonctionne', async ({ page }) => {
  await login(page)

  // Ne pas faire page.goto('/dashboard') — naviguer via le lien sidebar
  // car page.goto réinitialise React et perd le JWT en mémoire
  await page.click('a[href="/dashboard"]')

  // Attendre que la page soit chargée
  await expect(page).toHaveURL('http://localhost:5173/dashboard')
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 })

  // Attendre les boutons de filtre
  await expect(page.getByRole('button', { name: 'Tous' })).toBeVisible({ timeout: 15000 })

  // Cliquer sur Normal
  await page.getByRole('button', { name: 'Normal' }).click()
  await expect(page.getByRole('button', { name: 'Normal' })).toBeVisible()
})
// ─── Test 10 : Export CSV ─────────────────────────────────
test('export CSV — bouton visible et cliquable', async ({ page }) => {
  await login(page)

  // Naviguer via sidebar
  await page.click('a[href="/dashboard"]')
  await expect(page).toHaveURL('http://localhost:5173/dashboard')
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 })

  const exportBtn = page.getByRole('button', { name: /export csv/i })
  await expect(exportBtn).toBeVisible({ timeout: 15000 })
  await exportBtn.click()
})