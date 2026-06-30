# Frontend — Gateway IA

Interface React/TypeScript : chat connecté à la Gateway (avec affichage des PII détectées), et Dashboard d'Audit (graphiques, filtres, export CSV).

## 🧱 Stack

- **React 18** + **Vite** — build et dev server
- **TypeScript** (mode strict) — typage de bout en bout
- **Tailwind CSS** — styles utilitaires
- **Zustand** — état global (notamment l'authentification, JWT en mémoire)
- **Axios** — appels HTTP vers l'API backend
- **Recharts** — graphiques du Dashboard d'Audit
- **React Router** — navigation et routes protégées

## 📁 Structure (cible)

```
frontend/
├── src/
│   ├── components/
│   │   ├── ChatMessage.tsx     → affichage d'un message + badge de risque
│   │   └── ChatWindow.tsx      → liste de messages + input + streaming
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   └── DashboardPage.tsx   → graphiques Recharts + tableau d'audit
│   ├── stores/
│   │   └── authStore.ts        → Zustand : token, login(), logout()
│   ├── api/
│   │   └── chat.ts             → sendMessage() / sendMessageStream()
│   ├── types/
│   │   └── index.ts            → ChatMessage, AuditEvent, PIIDetection
│   └── App.tsx
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── .env.example
```

## ⚙️ Installation locale

```bash
cd frontend
npm install
cp .env.example .env       # VITE_API_URL=http://localhost:8000
npm run dev
```

Application disponible sur `http://localhost:5173`.

## 🔑 Variables d'environnement

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL de base de l'API backend (ex. `http://localhost:8000`) |

## 🏗️ Build production

```bash
npm run build       # génère le dossier dist/
npm run preview     # prévisualise le build en local
```

## 🧪 Tests

```bash
npx playwright test          # tests E2E (login, chat, dashboard, sécurité)
npx playwright test --ui     # mode interactif
```

## 🔐 Sécurité côté frontend

- Le JWT est stocké **en mémoire** (store Zustand), jamais dans `localStorage`, pour limiter les risques XSS.
- Les routes sensibles (`/dashboard`) sont protégées par un composant `PrivateRoute`.
- Les tokens PII (`[PERSONNE_1]`, `[EMAIL_1]`…) sont surlignés visuellement dans le chat avec une infobulle affichant la vraie valeur, pour rendre la sécurité visible côté utilisateur.

Détail de l'architecture complète : voir [`../Architecture-GatewayIA.html`](../Architecture-GatewayIA.html).