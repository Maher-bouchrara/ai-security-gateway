# Gateway IA — Sécurité & Anonymisation Réversible

> Réf. 01-2026 · Passerelle de sécurité intelligente permettant d'utiliser des LLM Cloud (GPT-4, Claude, Mistral…) sans jamais exposer de données personnelles (PII) à un tiers.

## 🎯 Le projet en une phrase

Les collaborateurs veulent utiliser les LLM les plus puissants du marché, mais le RGPD interdit d'envoyer des données personnelles à un fournisseur externe sans contrôle. Cette Gateway s'intercale entre l'utilisateur et le LLM : elle détecte et anonymise les PII avant l'envoi, sécurise les flux d'entrée/sortie, puis réinjecte les vraies données dans la réponse finale.

## 🧩 Fonctionnalités

- **Anonymisation dynamique par Vaulting** — détection des PII via Microsoft Presidio, remplacement par des tokens avant l'envoi au LLM
- **Sécurisation des flux (Input/Output)** — filtrage des injections de prompt (jailbreaking) en entrée et de la toxicité en sortie via LLM Guard
- **Matching inverse / Désanonymisation** — réinjection automatique des vraies données dans la réponse grâce à un coffre-fort (Vault) local
- **Dashboard d'Audit** — suivi des tentatives d'exfiltration et de la latence ajoutée par la couche de sécurité

## 🗺️ Architecture

Schéma complet du pipeline, des couches, de la base de données et des scénarios : voir [`Architecture-GatewayIA.html`](./Architecture-GatewayIA.html).

```
Utilisateur → Gateway API → Scan Input (LLM Guard) → Anonymize (Presidio + Vault)
            → LLM Cloud (LiteLLM) → Scan Output (LLM Guard) → Deanonymize (Vault)
            → Utilisateur
```

## 🧱 Stack technique

| Couche | Technologies |
|---|---|
| Backend | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy (async), python-jose (JWT) |
| Sécurité IA | Microsoft Presidio, SpaCy (fr_core_news_md), LLM Guard, LiteLLM |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts |
| Tests | pytest, Playwright (E2E), Locust (charge) |
| Infra | Docker, docker-compose, GitHub Actions (CI) |

## 📁 Structure du dépôt

```
GATEWAYIA/
├── backend/    → API FastAPI, sécurité IA, base de données (voir backend/README.md)
├── frontend/   → Interface React/TypeScript, chat + dashboard (voir frontend/README.md)
├── docs/       → Spécifications, ADRs, scénarios de démo (voir docs/README.md)
├── Architecture-GatewayIA.html   → Schémas d'architecture (pipeline, DB, scénarios)
├── Plan-GatewayIA.html           → Plan de travail par séances
├── ATS-GatewayIA.pdf             → Sujet officiel du stage (Réf. 01-2026)
└── README.md   → ce fichier
```

## 🚀 Démarrage rapide

```bash
git clone https://github.com/Maher-bouchrara/ai-security-gateway.git
cd GATEWAYIA
cp backend/.env.example backend/.env   # renseigner sa clé API LLM
docker-compose up --build
```

- Backend disponible sur `http://localhost:8000` (doc interactive sur `/docs`)
- Frontend disponible sur `http://localhost:5173`

Pour un lancement sans Docker, voir les instructions détaillées dans [`backend/README.md`](./backend/README.md) et [`frontend/README.md`](./frontend/README.md).

## 🛡️ Sécurité — risques OWASP couverts

| Risque | Protection |
|---|---|
| LLM01 — Prompt Injection | Scan d'entrée + blocage avant tout appel LLM |
| LLM02 — Insecure Output Handling | Scan de toxicité sur la réponse avant transmission |
| LLM06 — Sensitive Information Disclosure | Anonymisation systématique via Vault |

## 📌 Statut du projet

Projet réalisé en solo dans le cadre d'un stage de fin d'études (BUT3 Informatique). Avancement détaillé dans [`Plan-GatewayIA.html`](./Plan-GatewayIA.html).

## 👤 Auteur

Maher Bouchrara - junior software engineer