# Backend — Gateway IA

API FastAPI qui implémente le pipeline de sécurité complet : scan d'entrée, anonymisation/désanonymisation via Vault, appel au LLM, scan de sortie, audit.

## 🧱 Stack

- **FastAPI** + **Pydantic v2** — API REST et validation des données
- **SQLAlchemy** (async) + **aiosqlite** — persistance (Vault, audit, utilisateurs)
- **Microsoft Presidio** + **SpaCy** (`fr_core_news_md`) — détection des PII en français
- **LLM Guard** — filtrage des injections de prompt et de la toxicité
- **LiteLLM** — couche d'abstraction pour appeler GPT-4 / Claude / Mistral avec la même syntaxe
- **python-jose** + **passlib** — authentification JWT

## 📁 Structure (cible)

```
backend/
├── main.py                  → point d'entrée FastAPI, déclaration des routes
├── models/
│   ├── schemas.py           → modèles Pydantic (ChatRequest, ChatResponse...)
│   └── database.py          → modèles SQLAlchemy (vault_tokens, audit_events, users)
├── services/
│   ├── anonymizer.py        → PIIDetector, anonymize() / deanonymize()
│   ├── security_scanner.py  → InputScanner / OutputScanner (LLM Guard)
│   └── llm_client.py        → wrapper LiteLLM
├── crud.py                  → fonctions CRUD (create_token, log_event...)
├── auth.py                  → génération/vérification des JWT
├── tests/                   → pytest (test_routes.py, test_crud.py, anti-fuite PII)
├── docs/                    → Swagger généré automatiquement sur /docs
├── Dockerfile
├── docker-compose.yml
├── requirements.txt
└── .env.example
```

## ⚙️ Installation locale (sans Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows : venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download fr_core_news_md
cp .env.example .env            # renseigner sa clé API LLM (OPENAI_API_KEY...)
uvicorn main:app --reload
```

API disponible sur `http://localhost:8000`, documentation interactive sur `http://localhost:8000/docs`.

## 🐳 Avec Docker

```bash
docker-compose up --build
```

## 🔌 Endpoints principaux

| Méthode | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | non | Healthcheck |
| POST | `/chat` | non | Pipeline complet (scan → anonymize → LLM → scan → deanonymize) |
| POST | `/chat/stream` | non | Même pipeline, réponse en streaming SSE |
| GET | `/audit` | JWT | Historique paginé des événements de sécurité |
| GET | `/audit/stats` | JWT | Statistiques agrégées pour le dashboard |
| POST | `/auth/login` | non | Authentification, délivre un JWT |

Détail complet des contrats (body/réponse/erreurs) : voir [`../Architecture-GatewayIA.html`](../Architecture-GatewayIA.html).

## 🧪 Tests

```bash
pytest -v                       # suite complète
pytest tests/test_routes.py -v  # routes uniquement
pytest -k "anti_fuite"          # tests anti-fuite PII
```

CI : `.github/workflows/ci.yml` lance `pytest` à chaque push.

## 🗄️ Base de données

3 tables : `vault_tokens` (mapping token ↔ valeur réelle, TTL 24h), `audit_events` (historique de sécurité), `users` (authentification dashboard). Schéma détaillé (types, clés, relations) dans [`../Architecture-GatewayIA.html`](../Architecture-GatewayIA.html#db).