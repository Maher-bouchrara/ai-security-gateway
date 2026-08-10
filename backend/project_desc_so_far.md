# Gateway IA — Description complète du projet
> Dernière mise à jour : fin Session 7 / Phase 2 en cours · Prochaine : Session 8

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
| Dashboard d'Audit | Suivi des tentatives d'exfiltration et de la latence ajoutée par la sécurité | S8, S12–S14 |

---

## 🗺️ Pipeline de sécurité

```
Utilisateur (Frontend React)
    ↓ POST /chat
Gateway API (FastAPI)
    ↓
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 1 — anonymize()                                  │
│  Presidio + SpaCy FR détecte les PII                   │
│  "Marie Martin" → [PERSON_1]                           │
│  Mapping sauvegardé dans vault_tokens (TTL 24h)        │
└─────────────────────────────────────────────────────────┘
    ↓ texte anonymisé
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 2 — scan_input()                                 │
│  Scanner hybride 3 couches :                           │
│  1. Regex patterns connus (prompt injection)           │
│  2. Filtre contexte PII (évite faux positifs)          │
│  3. LLM Guard (filet de sécurité)                      │
│  → si bloqué : HTTP 400, log PROMPT_INJECTION          │
└─────────────────────────────────────────────────────────┘
    ↓ si safe
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 3 — LLM Cloud (via LiteLLM → Groq)              │
│  Reçoit uniquement le texte tokenisé                   │
│  Ne voit jamais les vraies données personnelles        │
└─────────────────────────────────────────────────────────┘
    ↓ réponse (avec tokens)
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 4 — scan_output()                                │
│  LLM Guard — Toxicity scanner                          │
│  → si toxique : HTTP 400, log TOXIC_OUTPUT             │
└─────────────────────────────────────────────────────────┘
    ↓ si safe
┌─────────────────────────────────────────────────────────┐
│  ÉTAPE 5 — deanonymize()                                │
│  Vault lookup : [PERSON_1] → "Marie Martin"            │
│  Réinjecte les vraies valeurs dans la réponse          │
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
│   ├── venv/                           ← environnement virtuel Python 3.11 (gitignored)
│   ├── models/
│   │   ├── __init__.py
│   │   ├── schemas.py                  ← modèles Pydantic (ChatRequest, ChatResponse)
│   │   └── database.py                 ← modèles SQLAlchemy + init_db() + UniqueConstraint
│   ├── services/
│   │   ├── __init__.py
│   │   ├── llm_client.py               ← wrapper LiteLLM → Groq (reply + tokens_used)
│   │   ├── anonymizer.py               ← PIIDetector + anonymize() + deanonymize() + custom recognizers TN/FR
│   │   └── security_scanner.py         ← InputScanner hybride (regex+PII+LLMGuard) + OutputScanner
│   ├── crud/
│   │   ├── __init__.py                 ← réexporte tout proprement
│   │   ├── vault_crud.py               ← create_token, get_token, save_mapping, get_mapping, delete_expired_tokens
│   │   └── audit_crud.py               ← log_event, get_events
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py                 ← init_db() avant les tests, drop_all après
│   │   ├── test_routes.py              ← tests /health et /chat (mock LLM)
│   │   ├── test_vault_crud.py          ← tests create_token, get_token
│   │   └── test_audit_crud.py          ← tests log_event, get_events
│   ├── main.py                         ← pipeline complet : anonymize→scan→LLM→scan→deanonymize→log
│   ├── Dockerfile                      ← image python:3.11-slim
│   ├── requirements.txt                ← dépendances figées (pip freeze)
│   ├── pytest.ini                      ← asyncio_mode = auto
│   ├── .env                            ← GROQ_API_KEY + GROQ_MODEL (gitignored)
│   ├── .env.example                    ← modèle vide commité
│   ├── .dockerignore
│   └── gateway.db                      ← SQLite (gitignored, créé au démarrage)
├── frontend/                           ← vide pour l'instant (Session 10)
├── docs/
│   ├── README.md
│   ├── pii_spec.md                     ← spécification des 14 entités PII (FR + TN)
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
| `event_type` | VARCHAR(32) | NORMAL, PII_DETECTED, PROMPT_INJECTION, JAILBREAK, TOXIC_OUTPUT |
| `severity` | VARCHAR(16) | low / medium / high / critical |
| `pii_count` | INTEGER | Nombre de PII détectées |
| `risk_score` | FLOAT | Score 0.0 → 1.0 |
| `latency_ms` | INTEGER | Latence totale du pipeline (ms) |
| `blocked` | BOOLEAN | Vrai si requête bloquée avant le LLM |
| `created_at` | DATETIME | Horodatage UTC |

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

Détail complet : `docs/pii_spec.md`

---

## 🔌 API REST (état actuel)

| Méthode | Route | Auth | Statut |
|---|---|---|---|
| GET | `/health` | non | ✅ Implémenté |
| POST | `/chat` | non | ✅ Pipeline complet (6 étapes) |
| POST | `/chat/stream` | non | 🔜 Session 9 |
| GET | `/audit` | JWT | 🔜 Session 8 |
| GET | `/audit/stats` | JWT | 🔜 Session 8 |
| POST | `/auth/login` | non | 🔜 Session 8 |

---

## ✅ Tâches réalisées

### Phase 1 — Fondations (Sessions 1–3) · TAG `v0.1.0-foundation`

#### Session 1 — Setup + Architecture + Squelette API ✅
- [x] Repo GitHub créé (`ai-security-gateway`)
- [x] Structure de dossiers créée (`backend/`, `frontend/`, `docs/`)
- [x] Venv Python 3.11 créé et activé (Windows)
- [x] Dépendances installées : FastAPI, uvicorn, Pydantic, httpx, python-dotenv, openai, LiteLLM
- [x] `.env` / `.env.example` / `.gitignore` configurés
- [x] Schéma d'architecture Excalidraw généré (`docs/architecture.excalidraw`)
- [x] Modèles Pydantic : `ChatRequest`, `ChatResponse` (`models/schemas.py`)
- [x] Service LLM : `services/llm_client.py` avec LiteLLM → Groq (`openai/gpt-oss-20b`)
- [x] Routes FastAPI : `GET /health`, `POST /chat`
- [x] CORS configuré pour le futur frontend (`http://localhost:5173`)
- [x] Test Swagger sur `/docs` validé

#### Session 2 — Persistance (Vault & Audit) + Docker ✅
- [x] Dépendances DB : SQLAlchemy (async), aiosqlite
- [x] Modèles SQLAlchemy : `VaultToken`, `AuditEvent` (`models/database.py`)
- [x] `init_db()` avec lifespan FastAPI
- [x] CRUD séparés par modèle (`crud/vault_crud.py`, `crud/audit_crud.py`)
- [x] `Dockerfile` + `docker-compose.yml` (volume code + hot-reload)
- [x] `.dockerignore` configuré

#### Session 3 — Tests, CI & Revue Phase 1 ✅
- [x] pytest + pytest-asyncio + httpx installés
- [x] `pytest.ini` : `asyncio_mode = auto`
- [x] `tests/conftest.py` : init_db() avant les tests, drop_all après
- [x] 6 tests pytest (routes + CRUD) — tous verts ✅
- [x] CI GitHub Actions verte à chaque push
- [x] Tag `v0.1.0-foundation` posé

### Phase 2 — Sécurité IA (en cours)

#### Session 4 — Spec PII + Microsoft Presidio ✅
- [x] Presidio + SpaCy FR installés (`fr_core_news_md`)
- [x] 4 custom recognizers : `PHONE_NUMBER_FR`, `PHONE_NUMBER_TN`, `IBAN_CODE_TN`, `CIN_TN`
- [x] Filtre faux positifs (LOCATION sur codes IBAN courts)
- [x] Déduplication des détections chevauchantes (score max par zone)
- [x] `docs/pii_spec.md` rédigé (14 entités, formats FR + TN, scores)
- [x] Tests sur phrases réelles FR + TN — scores 1.00 sur tous les custom recognizers

#### Session 5 — Vault (Tokenisation réversible) ✅
- [x] `AnonymizeResult` dataclass (anonymized_text + mapping + entity_count)
- [x] `anonymize(text) → AnonymizeResult` — remplace PII par tokens numérotés
- [x] `deanonymize(text, mapping) → str` — réinjecte les vraies valeurs
- [x] `save_mapping(mapping, session_id)` — sauvegarde en DB avec TTL 24h
- [x] `get_mapping(session_id)` — récupère le mapping depuis le Vault
- [x] Fix UNIQUE constraint : contrainte composite (token, session_id)
- [x] Fix timezone : `datetime.now(timezone.utc).replace(tzinfo=None)` partout
- [x] Pipeline branché dans `POST /chat` : anonymize → LLM → deanonymize → log_event
- [x] `tokens_used` réels lus depuis `response.usage.total_tokens` (LiteLLM)

#### Session 6 — LLM Guard (Filtrage I/O) ✅
- [x] Python 3.11 installé + venv recréé (Python 3.14 incompatible avec sentencepiece)
- [x] `pip install llm-guard` — modèles téléchargés en cache HuggingFace
- [x] `services/security_scanner.py` : scanner hybride 3 couches
  - Couche 1 : Regex patterns (12 patterns injection FR + EN)
  - Couche 2 : Filtre contexte PII (évite faux positifs sur données personnelles)
  - Couche 3 : LLM Guard `PromptInjection` (threshold=0.99)
- [x] `OutputScanner` : LLM Guard `Toxicity`
- [x] Résultats : 6/6 messages normaux OK · 5/5 attaques bloquées
- [x] Intégration dans `POST /chat` (HTTP 400 si attaque, log `blocked=True`)

#### Session 7 — Pipeline complet ✅
- [x] Ordre final validé : `anonymize → scan_input → LLM → scan_output → deanonymize → log`
- [x] 4 cas critiques testés et validés :
  - CAS 1 : Message normal → OK, pii: 0
  - CAS 2 : Message avec PII → OK, pii: 3, désanonymisé correctement
  - CAS 3 : Prompt injection → BLOQUÉ, reason: prompt_injection_pattern
  - CAS 4 : PII + Attaque combinées → BLOQUÉ, pii: 2 (attaque détectée avant que les PII atteignent le LLM)

---

## 🔜 Prochaines étapes

### Phase 2 — Sécurité IA (suite)

#### Session 8 — Routes /audit (JWT) + Tests anti-fuite PII ← prochaine
- [ ] `pip install python-jose[cryptography] passlib`
- [ ] `auth.py` : `create_access_token()`, `verify_token()`, `get_current_user()`
- [ ] Table `users` dans `database.py`
- [ ] `POST /auth/login` → retourne JWT
- [ ] `GET /audit` paginé (`from`, `to`, `type`, `page`, `limit`) protégé JWT
- [ ] `GET /audit/stats` (totaux, PII/7j, latence moyenne) protégé JWT
- [ ] Tests anti-fuite pytest : PII absentes du message envoyé au LLM
- [ ] `docs/security_report.md`

#### Session 9 — SSE Streaming + Audit OWASP
- [ ] `POST /chat/stream` avec `StreamingResponse`
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
| Tests | conftest.py + init_db | Évite "no such table" en CI |
| Docker dev | Volume code + --reload | Hot-reload sans rebuild à chaque modif |
| Python | 3.11 (pas 3.14) | sentencepiece (dep llm-guard) incompatible Python 3.14 |
| Modèle Groq | openai/gpt-oss-20b | llama3-70b-8192 et llama-3.3-70b-versatile dépréciés |
| Scanner Input | Hybride 3 couches | LLM Guard seul = trop de faux positifs sur données FR/TN |
| Ordre pipeline | anonymize → scan | PII retirées avant que LLM Guard les voie → 0 faux positif |
| UNIQUE Vault | (token, session_id) | Token unique par session, pas global — permet multi-sessions |
| Timezone | datetime.now(timezone.utc) | datetime.utcnow() causait des bugs de comparaison dans SQLite |
| Recognizers PII | Custom PatternRecognizer | Presidio natif ne couvre pas les formats tunisiens |
| session_id | Généré par le frontend (S10) | Scope les tokens du Vault par conversation |
| user_id | Issu du JWT (Session 8) | Lié à l'authentification, pas encore implémenté |