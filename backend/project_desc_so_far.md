# Gateway IA — Description complète du projet
> Dernière mise à jour : fin Session 3 / Phase 1 terminée · Tag `v0.1.0-foundation`

---

## 🎯 Le projet

**Sujet officiel (Réf. 01-2026) :** Développement de Gateway de Sécurité IA & Anonymisation Réversible.

**En une phrase :** Une passerelle intelligente qui s'intercale entre l'utilisateur et un LLM Cloud (GPT, Claude, Mistral…) pour détecter et anonymiser les données personnelles (PII) avant l'envoi, sécuriser les flux d'entrée/sortie, puis réinjecter les vraies données dans la réponse finale — sans que le LLM n'ait jamais vu une donnée sensible.

**Contexte :** Le RGPD interdit d'envoyer des données personnelles à un fournisseur tiers (le LLM) sans contrôle. Ce projet résout ce problème de façon transparente pour l'utilisateur.

---

## 🧩 Fonctionnalités à développer (sujet)

| Fonctionnalité | Description | Sessions |
|---|---|---|
| Anonymisation dynamique par Vaulting | Détection PII via Presidio, remplacement par tokens avant envoi au LLM | S4, S5 |
| Sécurisation des flux (Input/Output) | Filtrage injections de prompt (jailbreak) en entrée, toxicité en sortie via LLM Guard | S6 |
| Matching inverse / Désanonymisation | Réinjection des vraies données dans la réponse via Vault local | S5, S7 |
| Dashboard d'Audit | Suivi des tentatives d'exfiltration et de la latence ajoutée par la sécurité | S8, S12–S14 |

---

## 🗺️ Pipeline de sécurité

```
Utilisateur (Frontend React)
    ↓ POST /chat
Gateway API (FastAPI)
    ↓ scan_input()
LLM Guard — InputScanner (PromptInjection, Jailbreak)
    ↓ si safe → anonymize()
Presidio + Vault (vault_tokens SQLite, TTL 24h)
    ↓ texte tokenisé uniquement
LLM Cloud (via LiteLLM → Groq)
    ↓ réponse (avec tokens)
LLM Guard — OutputScanner (Toxicity, Sensitive, Relevance)
    ↓ deanonymize()
Vault lookup (remplace tokens → vraies valeurs)
    ↓
Utilisateur (réponse finale, PII surlignées dans l'UI)
```

À chaque étape → un événement loggé dans `audit_events` → visible dans le Dashboard.

---

## 🧱 Stack technique

| Couche | Technologies |
|---|---|
| **Backend** | Python 3.11, FastAPI, Pydantic v2, SQLAlchemy (async), aiosqlite, python-jose (JWT) |
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
│   ├── venv/                           ← environnement virtuel Python (gitignored)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py                  ← modèles Pydantic (ChatRequest, ChatResponse)
│   │   └── database.py                 ← modèles SQLAlchemy + init_db()
│   ├── services/
│   │   ├── __init__.py
│   │   └── llm_client.py               ← wrapper LiteLLM → Groq
│   ├── crud/
│   │   ├── __init__.py                 ← réexporte create_token, log_event...
│   │   ├── vault_crud.py               ← CRUD table vault_tokens
│   │   └── audit_crud.py               ← CRUD table audit_events
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                 ← init_db() avant les tests, drop_all après
│   │   ├── test_routes.py              ← tests /health et /chat (mock LLM)
│   │   ├── test_vault_crud.py          ← tests create_token, get_token
│   │   └── test_audit_crud.py          ← tests log_event, get_events
│   ├── main.py                         ← app FastAPI, routes /health /chat, lifespan
│   ├── Dockerfile                      ← image python:3.11-slim
│   ├── requirements.txt                ← dépendances figées (pip freeze)
│   ├── pytest.ini                      ← asyncio_mode = auto
│   ├── .env                            ← GROQ_API_KEY + GROQ_MODEL (gitignored)
│   ├── .env.example                    ← modèle vide commité
│   ├── .dockerignore
│   └── gateway.db                      ← SQLite (gitignored, créé au démarrage)
├── frontend/                           ← vide pour l'instant (Session 10)
├── docs/                               ← vide pour l'instant
│   └── README.md
├── docker-compose.yml                  ← service backend avec volume + hot-reload
├── Architecture-GatewayIA.html         ← schémas visuels du système
├── Plan-GatewayIA.html                 ← plan de travail par séances
├── ATS-GatewayIA.pdf                   ← sujet officiel du stage
└── README.md                           ← README principal du projet
```

---

## 🗄️ Base de données (SQLite — `gateway.db`)

### Table `vault_tokens`
| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Identifiant unique |
| `token` | VARCHAR(64) UNIQUE | Le jeton généré ex. `[PERSONNE_1]` |
| `original_value` | TEXT | La vraie valeur remplacée (jamais loggée ailleurs) |
| `entity_type` | VARCHAR(32) | PERSON, EMAIL, PHONE, IBAN… |
| `session_id` | VARCHAR(64) | Scope d'isolation par conversation |
| `created_at` | DATETIME | Date de création |
| `expires_at` | DATETIME | Expiration TTL 24h |

### Table `audit_events`
| Colonne | Type | Description |
|---|---|---|
| `id` | INTEGER PK | Identifiant unique |
| `session_id` | VARCHAR(64) | Session concernée |
| `event_type` | VARCHAR(32) | NORMAL, PII_DETECTED, PROMPT_INJECTION, JAILBREAK, TOXIC_OUTPUT |
| `severity` | VARCHAR(16) | low / medium / high / critical |
| `pii_count` | INTEGER | Nombre de PII détectées |
| `risk_score` | FLOAT | Score 0.0 → 1.0 |
| `latency_ms` | INTEGER | Latence ajoutée par la sécurité (ms) |
| `blocked` | BOOLEAN | Vrai si requête bloquée avant le LLM |
| `created_at` | DATETIME | Horodatage |

---

## 🔌 API REST (état actuel)

| Méthode | Route | Auth | Statut |
|---|---|---|---|
| GET | `/health` | non | ✅ Implémenté |
| POST | `/chat` | non | ✅ Implémenté |
| POST | `/chat/stream` | non | 🔜 Session 9 |
| GET | `/audit` | JWT | 🔜 Session 8 |
| GET | `/audit/stats` | JWT | 🔜 Session 8 |
| POST | `/auth/login` | non | 🔜 Session 8 |

---

## ✅ Tâches réalisées

### Phase 1 — Fondations (Sessions 1–3) · TAG `v0.1.0-foundation`

#### Session 1 — Setup + Architecture + Squelette API
- [x] Repo GitHub créé (`ai-security-gateway`)
- [x] Structure de dossiers créée (`backend/`, `frontend/`, `docs/`)
- [x] Venv Python créé et activé (Windows)
- [x] Dépendances installées : FastAPI, uvicorn, Pydantic, httpx, python-dotenv, openai, LiteLLM
- [x] `.env` / `.env.example` / `.gitignore` configurés
- [x] Schéma d'architecture Excalidraw généré (`docs/architecture.excalidraw`)
- [x] Modèles Pydantic : `ChatRequest`, `ChatResponse` (`models/schemas.py`)
- [x] Service LLM : `services/llm_client.py` avec LiteLLM → Groq (`openai/gpt-oss-20b`)
- [x] Routes FastAPI : `GET /health`, `POST /chat`
- [x] CORS configuré pour le futur frontend (`http://localhost:5173`)
- [x] Test Swagger sur `/docs` validé

#### Session 2 — Persistance (Vault & Audit) + Docker
- [x] Dépendances DB installées : SQLAlchemy (async), aiosqlite
- [x] Modèles SQLAlchemy : `VaultToken`, `AuditEvent` (`models/database.py`)
- [x] `init_db()` avec lifespan FastAPI (création auto des tables au démarrage)
- [x] CRUD séparés par modèle :
  - `crud/vault_crud.py` : `create_token()`, `get_token()`, `delete_expired_tokens()`
  - `crud/audit_crud.py` : `log_event()`, `get_events()`
  - `crud/__init__.py` : réexporte tout proprement
- [x] `Dockerfile` (`python:3.11-slim`)
- [x] `docker-compose.yml` à la racine (volume code + hot-reload `--reload`)
- [x] `.dockerignore` configuré
- [x] Test CRUD manuel validé (`gateway.db` créé, tables vérifiées)

#### Session 3 — Tests, CI & Revue Phase 1
- [x] Dépendances test installées : pytest, pytest-asyncio, httpx
- [x] `pytest.ini` : `asyncio_mode = auto`
- [x] `tests/conftest.py` : `init_db()` avant les tests, `drop_all` après (fix CI)
- [x] `tests/test_routes.py` : test `/health` + test `/chat` avec mock LLM
- [x] `tests/test_vault_crud.py` : test `create_token`, `get_token`, token inexistant
- [x] `tests/test_audit_crud.py` : test `log_event`, `get_events`
- [x] CI GitHub Actions (`.github/workflows/ci.yml`) : pytest à chaque push sur `main`
- [x] Secret `GROQ_API_KEY` ajouté dans GitHub Secrets
- [x] CI verte ✅ (6 tests passés)
- [x] Tag `v0.1.0-foundation` posé

---

## 🔜 Prochaines étapes

### Phase 2 — Sécurité IA (Sessions 4–9)

#### Session 4 — Spec PII + Microsoft Presidio *(prochaine)*
- [ ] Lire CNIL + OWASP LLM Top 10 (LLM01, LLM02, LLM06)
- [ ] Rédiger `docs/pii_spec.md` (15 entités PII, format, exemple, criticité)
- [ ] Installer Presidio + SpaCy FR : `pip install presidio-analyzer presidio-anonymizer` + `python -m spacy download fr_core_news_md`
- [ ] Créer `services/anonymizer.py` : classe `PIIDetector` + méthode `analyze(text)`
- [ ] Tester sur 10 phrases françaises variées

#### Session 5 — Vault (Tokenisation réversible)
- [ ] `anonymize(text, session_id) → AnonymizeResult`
- [ ] Sauvegarde dans `vault_tokens` avec TTL 24h
- [ ] `deanonymize(text, session_id) → str`
- [ ] Test bout en bout : anonymise → LLM → désanonymise

#### Session 6 — LLM Guard (Filtrage I/O)
- [ ] `pip install llm-guard`
- [ ] `services/security_scanner.py` : `InputScanner`, `OutputScanner`
- [ ] Intégration dans `POST /chat` (blocage HTTP 400 si attaque)
- [ ] Mesure de latence avec `time.perf_counter()`

#### Session 7 — Pipeline complet
- [ ] Assembler les 6 étapes dans `POST /chat`
- [ ] Tester les 4 cas : normal / PII / attaque / PII+attaque

#### Session 8 — Routes /audit (JWT) + Tests anti-fuite PII
- [ ] `GET /audit` paginé + `GET /audit/stats`
- [ ] Auth JWT (python-jose + passlib)
- [ ] Tests anti-fuite pytest

#### Session 9 — SSE Streaming + Audit OWASP
- [ ] `POST /chat/stream` avec StreamingResponse
- [ ] Désanonymisation à la volée pendant le streaming
- [ ] Checklist OWASP API Security Top 10
- [ ] Tag `v0.2.0-security`

### Phase 3 — Frontend React (Sessions 10–14)
- [ ] S10 : Setup Vite/React/TS + Chat UI
- [ ] S11 : Streaming token par token
- [ ] S12 : Dashboard Recharts
- [ ] S13 : Auth JWT + filtres/export CSV
- [ ] S14 : Tests E2E Playwright + charge Locust · Tag `v0.3.0-frontend`

### Phase 4 — Finalisation (Sessions 15–17)
- [ ] S15 : Docs techniques + Docker prod
- [ ] S16 : Slides de soutenance
- [ ] S17 : Répétitions + Tag `v1.0.0`

---

## 🛠️ Commandes utiles

```powershell
# Activer le venv (depuis backend/)
venv\Scripts\Activate.ps1

# Lancer en local (sans Docker)
uvicorn main:app --reload

# Lancer avec Docker (depuis la racine)
docker-compose up --build

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
```

---

## 📌 Décisions techniques (ADRs résumés)

| Décision | Choix | Raison |
|---|---|---|
| LLM provider | Groq (gratuit) | Pas de clé OpenAI, free tier Groq suffisant |
| Abstraction LLM | LiteLLM | Change de modèle sans toucher au code, juste `.env` |
| DB | SQLite (aiosqlite) | Simple, sans serveur, suffisant pour un projet solo |
| ORM | SQLAlchemy async | Compatible FastAPI async, séparation CRUD par modèle |
| CRUD | Séparés par modèle | Maintenabilité, cohérent avec la logique services/ |
| Tests | conftest.py + init_db | Évite "no such table" en CI (pas de gateway.db existant) |
| Docker dev | Volume code + --reload | Hot-reload sans rebuild à chaque modif |
| Modèle Groq | openai/gpt-oss-20b | llama3-70b-8192 déprécié, llama-3.3-70b-versatile aussi déprécié (juin 2026) |