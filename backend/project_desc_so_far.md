# Gateway IA — Description complète du projet
> Dernière mise à jour : fin Session 9 / Phase 2 terminée ✅ · Tag `v0.2.0-security` · Prochaine : Session 10

---

## 🎯 Le projet

**Sujet officiel (Réf. 01-2026) :** Développement de Gateway de Sécurité IA & Anonymisation Réversible.

**En une phrase :** Une passerelle intelligente qui s'intercale entre l'utilisateur et un LLM Cloud (GPT, Claude, Mistral…) pour détecter et anonymiser les données personnelles (PII) avant l'envoi, sécuriser les flux d'entrée/sortie, puis réinjecter les vraies données dans la réponse finale — sans que le LLM n'ait jamais vu une donnée sensible.

**Contexte :** Le RGPD interdit d'envoyer des données personnelles à un fournisseur tiers (le LLM) sans contrôle. Ce projet résout ce problème de façon transparente pour l'utilisateur.

---

## 🧩 Fonctionnalités à développer (sujet)

| Fonctionnalité | Description | Sessions |
|---|---|---|
| Anonymisation dynamique par Vaulting | Détection PII via Presidio, remplacement par tokens avant envoi au LLM | S4, S5 ✅ |
| Sécurisation des flux (Input/Output) | Filtrage injections de prompt (jailbreak) en entrée, toxicité en sortie via LLM Guard | S6 ✅ |
| Matching inverse / Désanonymisation | Réinjection des vraies données dans la réponse via Vault local | S5 ✅, S7 ✅ |
| Dashboard d'Audit | Suivi des tentatives d'exfiltration et de la latence ajoutée par la sécurité | S8 ✅ (backend), S12–S14 (frontend) |

---

## 🗺️ Pipeline de sécurité

```
Utilisateur (Frontend React)
    ↓ POST /chat  ou  POST /chat/stream
Gateway API (FastAPI)
    ↓
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 1 — anonymize()                                  │
│  Presidio + SpaCy FR détecte les PII                   │
│  "Marie Martin" → [PERSON_1]                           │
│  Mapping sauvegardé dans vault_tokens (TTL 24h)        │
└─────────────────────────────────────────────────────────┘
    ↓ message original (pas l'anonymisé — important !)
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 2 — scan_input()                                 │
│  Scanner hybride 3 couches :                           │
│  1. Regex patterns connus (prompt injection FR + EN)   │
│  2. Filtre contexte PII (évite faux positifs)          │
│  3. LLM Guard PromptInjection (threshold=0.99)         │
│  → si bloqué : HTTP 400, log PROMPT_INJECTION          │
└─────────────────────────────────────────────────────────┘
    ↓ si safe — texte anonymisé envoyé au LLM
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 3 — LLM Cloud (via LiteLLM → Groq)              │
│  Reçoit uniquement le texte tokenisé                   │
│  Ne voit jamais les vraies données personnelles        │
└─────────────────────────────────────────────────────────┘
    ↓ réponse (avec tokens) — chunk par chunk si streaming
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 4 — scan_output()                                │
│  Regex FR (insultes) + LLM Guard Toxicity              │
│  → si toxique : HTTP 400, log TOXIC_OUTPUT             │
└─────────────────────────────────────────────────────────┘
    ↓ si safe
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 5 — deanonymize()                                │
│  Vault lookup : [PERSON_1] → "Marie Martin"            │
│  En streaming : buffer par mot pour éviter coupure     │
└─────────────────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 6 — log_event()                                  │
│  Enregistre dans audit_events :                        │
│  event_type, severity, pii_count, latency_ms, blocked  │
└─────────────────────────────────────────────────────────┘
    ↓
Utilisateur (réponse finale avec vraies valeurs)
```

---

## 🧱 Stack technique

| Couche | Technologies |
|---|---|
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy (async), aiosqlite, python-jose (JWT), passlib, bcrypt==4.0.1 |
| **Sécurité IA** | Microsoft Presidio, SpaCy (fr_core_news_md), LLM Guard, LiteLLM |
| **LLM** | Groq (modèle `openai/gpt-oss-20b`) via LiteLLM — gratuit |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Recharts, React Router |
| **Tests** | pytest, pytest-asyncio, httpx, Playwright (E2E), Locust (charge) |
| **Infra** | Docker, docker-compose, GitHub Actions (CI) |

---

## 📁 Structure des dossiers (état actuel)

```
GATEWAYIA/                              ← racine du repo
├── .github/
│   └── workflows/
│       └── ci.yml                      ← CI GitHub Actions (pytest à chaque push)
├── backend/
│   ├── venv/                           ← environnement virtuel Python 3.11 (gitignored)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py                  ← ChatRequest, ChatResponse, LoginRequest, TokenResponse, AuditEventSchema, AuditStatsSchema
│   │   └── database.py                 ← VaultToken, AuditEvent, User + init_db() + UniqueConstraint
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_client.py               ← wrapper LiteLLM → Groq (reply + tokens_used)
│   │   ├── anonymizer.py               ← PIIDetector + anonymize() + deanonymize() + custom recognizers TN/FR
│   │   ├── security_scanner.py         ← InputScanner hybride (regex+PII+LLMGuard) + OutputScanner (regex FR + LLMGuard)
│   │   └── auth.py                     ← hash_password, verify_password, create_access_token, decode_token, get_current_user
│   ├── crud/
│   │   ├── __init__.py                 ← réexporte tout proprement
│   │   ├── vault_crud.py               ← create_token, get_token, save_mapping, get_mapping, delete_expired_tokens
│   │   ├── audit_crud.py               ← log_event, get_events (paginé + filtrable)
│   │   └── user_crud.py                ← create_user, get_user_by_email
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                 ← init_db() avant les tests, drop_all après
│   │   ├── test_routes.py              ← tests /health et /chat (mock LLM)
│   │   ├── test_vault_crud.py          ← tests create_token, get_token
│   │   ├── test_audit_crud.py          ← tests log_event, get_events
│   │   └── test_antifuite.py           ← 5 tests : PII jamais envoyées au LLM
│   ├── main.py                         ← pipeline complet + /chat/stream SSE + routes auth + routes audit
│   ├── Dockerfile                      ← image python:3.11-slim
│   ├── requirements.txt                ← dépendances figées (pip freeze)
│   ├── pytest.ini                      ← asyncio_mode = auto
│   ├── .env                            ← GROQ_API_KEY + GROQ_MODEL + SECRET_KEY (gitignored)
│   ├── .env.example                    ← modèle vide commité
│   ├── .dockerignore
│   └── gateway.db                      ← SQLite (gitignored, créé au démarrage)
├── frontend/                           ← vide pour l'instant (Session 10)
├── docs/
│   ├── README.md
│   ├── pii_spec.md                     ← spécification des 14 entités PII (FR + TN)
│   ├── security_report.md              ← rapport de sécurité + checklist OWASP
│   └── architecture.excalidraw         ← schéma d'architecture
├── docker-compose.yml                  ← service backend avec volume + hot-reload
├── Architecture-GatewayIA.html         ← schémas visuels du système
├── Plan-GatewayIA.html                 ← plan de travail par séances
├── ATS-GatewayIA.pdf                   ← sujet officiel du stage
└── README.md                           ← README principal du projet
```

---

## 🗄️ Base de données (SQLite — `gateway.db`)

### Table `vault_tokens`
| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| `id` | INTEGER | PK | Identifiant unique |
| `token` | VARCHAR(64) | INDEX | Le jeton généré ex. `[PERSON_1]` |
| `original_value` | TEXT | NOT NULL | La vraie valeur remplacée |
| `entity_type` | VARCHAR(32) | NOT NULL | PERSON, EMAIL_ADDRESS, PHONE_NUMBER_FR… |
| `session_id` | VARCHAR(64) | INDEX | Scope d'isolation par conversation |
| `created_at` | DATETIME | UTC | Date de création |
| `expires_at` | DATETIME | NOT NULL | Expiration TTL 24h |
| — | — | UNIQUE(token, session_id) | Contrainte composite |

### Table `audit_events`
| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Identifiant unique |
| `session_id` | VARCHAR(64) | Session concernée |
| `event_type` | VARCHAR(32) | NORMAL, PII_DETECTED, PROMPT_INJECTION, TOXIC_OUTPUT |
| `severity` | VARCHAR(16) | low / medium / high / critical |
| `pii_count` | INTEGER | Nombre de PII détectées |
| `risk_score` | FLOAT | Score 0.0 → 1.0 |
| `latency_ms` | INTEGER | Latence totale du pipeline (ms) |
| `blocked` | BOOLEAN | Vrai si requête bloquée avant le LLM |
| `created_at` | DATETIME | Horodatage UTC |

### Table `users`
| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Identifiant unique |
| `email` | VARCHAR(120) UNIQUE | Identifiant de connexion |
| `hashed_password` | VARCHAR(255) | Mot de passe haché bcrypt (jamais en clair) |
| `role` | VARCHAR(16) | `admin` ou `viewer` (défaut: viewer) |
| `created_at` | DATETIME | Date de création UTC |

---

## 🔐 Entités PII détectées

| Entité | Type interne | FR | TN | Score | Source |
|---|---|---|---|---|---|
| Nom complet | `PERSON` | ✅ | ✅ | 0.85 | SpaCy FR |
| Email | `EMAIL_ADDRESS` | ✅ | ✅ | 0.99 | Presidio natif |
| Téléphone FR | `PHONE_NUMBER_FR` | ✅ | — | 1.00 | Custom regex |
| Téléphone TN | `PHONE_NUMBER_TN` | — | ✅ | 1.00 | Custom regex |
| IBAN France | `IBAN_CODE` | ✅ | — | 1.00 | Presidio natif |
| IBAN Tunisie | `IBAN_CODE_TN` | — | ✅ | 1.00 | Custom regex |
| CIN tunisien | `CIN_TN` | — | ✅ | 0.65 | Custom regex |
| Carte de crédit | `CREDIT_CARD` | ✅ | ✅ | 0.99 | Presidio natif |
| Adresse IP | `IP_ADDRESS` | ✅ | ✅ | 0.95 | Presidio natif |
| URL | `URL` | ✅ | ✅ | 0.95 | Presidio natif |
| Date | `DATE_TIME` | ✅ | ✅ | 0.85 | Presidio natif |
| Localisation | `LOCATION` | ✅ | ✅ | 0.85 | SpaCy FR |

Détail complet + cas limites : `docs/pii_spec.md` · Résultats des tests : `docs/security_report.md`

---

## 🔌 API REST (état actuel)

| Méthode | Route | Auth | Statut |
|---|---|---|---|
| GET | `/health` | non | ✅ Implémenté |
| POST | `/chat` | non | ✅ Pipeline complet (6 étapes) |
| POST | `/chat/stream` | non | ✅ SSE streaming + désanonymisation buffer |
| POST | `/auth/register` | non | ✅ Crée un compte (hash bcrypt) |
| POST | `/auth/login` | non | ✅ Retourne un JWT (60 min) |
| POST | `/auth/token` | non | ✅ Compatible formulaire Swagger (caché dans la doc) |
| GET | `/audit` | JWT | ✅ Historique paginé + filtrable |
| GET | `/audit/stats` | JWT | ✅ Totaux + répartition par type |

---

## ✅ Tâches réalisées

### Phase 1 — Fondations (Sessions 1–3) · TAG `v0.1.0-foundation`

#### Session 1 ✅ · Session 2 ✅ · Session 3 ✅
*(voir versions précédentes du fichier pour le détail)*
- Backend FastAPI + LiteLLM/Groq · DB SQLite + CRUD · Docker + CI · 11 tests verts

### Phase 2 — Sécurité IA (Sessions 4–9) · TAG `v0.2.0-security` ✅

#### Session 4 — Spec PII + Microsoft Presidio ✅
- [x] Presidio + SpaCy FR + 4 custom recognizers (FR + TN)
- [x] 14 entités PII détectées, scores 1.00 sur formats tunisiens
- [x] `docs/pii_spec.md` rédigé

#### Session 5 — Vault (Tokenisation réversible) ✅
- [x] `anonymize()` / `deanonymize()` + `save_mapping()` / `get_mapping()`
- [x] Fix UNIQUE constraint (token, session_id) + Fix timezone UTC
- [x] Pipeline branché dans `POST /chat`

#### Session 6 — LLM Guard (Filtrage I/O) ✅
- [x] InputScanner hybride 3 couches + OutputScanner regex FR + LLM Guard
- [x] Score 30/30 (100%) — `docs/security_report.md`

#### Session 7 — Pipeline complet ✅
- [x] Ordre final validé : `anonymize → scan_input(original) → LLM → scan_output → deanonymize → log`
- [x] 4 cas critiques validés : normal / PII / attaque / PII+attaque

#### Session 8 — Routes /audit (JWT) + Tests anti-fuite PII ✅
- [x] Table `users` + `services/auth.py` + `crud/user_crud.py`
- [x] Routes `/auth/register`, `/auth/login`, `/auth/token` (Swagger caché)
- [x] `GET /audit` + `GET /audit/stats` protégés JWT
- [x] `tests/test_antifuite.py` : 5/5 ✅ · Total : **11/11** ✅

#### Session 9 — SSE Streaming + Audit OWASP ✅
- [x] `POST /chat/stream` avec `StreamingResponse` + stream LiteLLM
- [x] Buffer par mot pour éviter la coupure des tokens PII en streaming
- [x] Désanonymisation à la volée dans le générateur SSE
- [x] Checklist OWASP API Security Top 10 : 7/10 couverts, 3 améliorations futures documentées
- [x] `docs/security_report.md` mis à jour avec la section OWASP
- [x] Tag `v0.2.0-security` posé

---

## 🔜 Prochaines étapes

### Phase 3 — Frontend React (Sessions 10–14) ← en cours

#### Session 10 — Setup Vite/React/TS + Chat UI ← prochaine
- [ ] `npm create vite@latest frontend -- --template react-ts`
- [ ] Tailwind CSS + Zustand + Axios + Recharts + React Router
- [ ] Structure `src/{components,pages,stores,api,types}`
- [ ] `ChatMessage.tsx` + `ChatWindow.tsx` + `api/chat.ts`
- [ ] Surligner les tokens PII détectés (badge de risque)
- [ ] Ajouter le service frontend au `docker-compose.yml`

#### Session 11 — Streaming Chat (token par token)
- [ ] `sendMessageStream()` avec fetch + ReadableStream
- [ ] Effet typing dans `ChatWindow.tsx`

#### Session 12 — Dashboard Recharts
- [ ] BarChart (PII/jour) + LineChart (latence) + PieChart (répartition)
- [ ] 4 cartes stats depuis `GET /audit/stats`

#### Session 13 — Auth JWT + Filtres/Export CSV
- [ ] `LoginPage.tsx` + `authStore.ts` (Zustand, JWT en mémoire)
- [ ] `PrivateRoute` + intercepteur Axios
- [ ] Filtres + export CSV côté frontend

#### Session 14 — Tests E2E Playwright + Charge Locust · Tag `v0.3.0-frontend`

### Phase 4 — Finalisation (Sessions 15–17)
- [ ] S15 : Docs techniques + Docker prod
- [ ] S16 : Slides de soutenance
- [ ] S17 : Répétitions + Tag `v1.0.0`

---

## 🛠️ Commandes utiles

```powershell
# Activer le venv (depuis backend/)
venv\Scripts\Activate.ps1

# Lancer en local
uvicorn main:app --reload

# Lancer avec Docker (depuis la racine)
docker-compose up

# Lancer les tests
pytest -v

# Figer les dépendances
pip freeze > requirements.txt
```

---

## 🔑 Variables d'environnement (`.env`)

```
GROQ_API_KEY=ta_cle_groq_ici
GROQ_MODEL=groq/openai/gpt-oss-20b
SECRET_KEY=change-me-in-production
```

---

## 📌 Décisions techniques (ADRs résumés)

| Décision | Choix | Raison |
|---|---|---|
| LLM provider | Groq (gratuit) | Pas de clé OpenAI, free tier suffisant |
| Abstraction LLM | LiteLLM | Change de modèle sans toucher au code |
| DB | SQLite (aiosqlite) | Simple, sans serveur, suffisant pour un projet solo |
| ORM | SQLAlchemy async | Compatible FastAPI async |
| CRUD | Séparés par modèle | Maintenabilité |
| Tests | conftest.py + init_db | Évite "no such table" en CI |
| Docker dev | Volume code + --reload | Hot-reload sans rebuild |
| Python | 3.11 (pas 3.14) | sentencepiece incompatible Python 3.14 |
| bcrypt | 4.0.1 (pas latest) | Versions récentes incompatibles avec passlib |
| Scanner Input | Hybride 3 couches | LLM Guard seul = trop de faux positifs sur données FR/TN |
| Scan message | Original (pas anonymisé) | SpaCy peut masquer une injection en `[PERSON_1]` |
| OutputScanner | Regex FR + LLM Guard | LLM Guard Toxicity ne couvre pas le français |
| UNIQUE Vault | (token, session_id) | Token unique par session, pas global |
| Timezone | datetime.now(timezone.utc) | datetime.utcnow() causait des bugs SQLite |
| Recognizers PII | Custom PatternRecognizer | Presidio natif ne couvre pas les formats tunisiens |
| JWT stockage | En mémoire (Zustand) | Évite XSS via localStorage |
| /auth/token | include_in_schema=False | Caché dans Swagger mais utilisé par le bouton Authorize |
| Streaming buffer | Buffer par mot | Évite la coupure des tokens PII entre chunks SSE |
| session_id | Généré par le frontend (S10) | Scope les tokens du Vault par conversation |
| user_id | Issu du JWT (S8) | Lié à l'authentification |