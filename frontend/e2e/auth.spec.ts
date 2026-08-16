import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const EMAIL = 'admin@gmail.com'
const PASSWORD = 'admin'

// ─── Test 1 : Login réussi ────────────────────────────────
test('login réussi → redirige vers /chat', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`)

  // Remplir le formulaire
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')

  // Vérifier la redirection
  await expect(page).toHaveURL(`${BASE_URL}/chat`)

  // Vérifier que la sidebar est visible
  await expect(page.locator('aside')).toBeVisible()
})

// ─── Test 2 : Login échoué ────────────────────────────────
test('login échoué → message d\'erreur visible', async ({ page }) => {
  await page.goto(`${BASE_URL}/login`)

  await page.fill('input[type="email"]', 'mauvais@email.com')
  await page.fill('input[type="password"]', 'mauvaismdp')
  await page.click('button[type="submit"]')

  // Vérifier qu'on reste sur /login
  await expect(page).toHaveURL(`${BASE_URL}/login`)

  // Vérifier le message d'erreur
  await expect(page.locator('text=Email ou mot de passe incorrect').or(
    page.locator('text=Invalid email or password')
  )).toBeVisible()
})

// ─── Test 3 : Route protégée sans login ──────────────────
test('accès /dashboard sans login → redirection /login', async ({ page }) => {
  // Aller directement sur le dashboard sans être connecté
  await page.goto(`${BASE_URL}/dashboard`)

  // Doit rediriger vers /login
  await expect(page).toHaveURL(`${BASE_URL}/login`)
})

// ─── Test 4 : Déconnexion ─────────────────────────────────
test('déconnexion → retour /login', async ({ page }) => {
  // Se connecter d'abord
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASSWORD)
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL(`${BASE_URL}/chat`)

  // Cliquer sur déconnexion
  await page.getByRole('button', { name: /déconnexion|logout/i }).click()
  // Vérifier le retour sur /login
  await expect(page).toHaveURL(`${BASE_URL}/login`)
})