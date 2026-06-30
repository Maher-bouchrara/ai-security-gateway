# Docs — Gateway IA

Documentation technique et de cadrage du projet : spécifications, choix d'architecture, scénarios de démo, rapport de sécurité.

## 📄 Contenu (cible)

| Fichier | Contenu | Créé en session |
|---|---|---|
| `pii_spec.md` | Liste des 15 entités PII détectées (format, exemple, criticité) + format de tokenisation | S4 |
| `architecture_decisions.md` | ADRs — pourquoi Presidio vs alternative, SQLite vs PostgreSQL, FastAPI vs Django | S15 |
| `demo_scenario.md` | Script exact de la démo de soutenance (phrases à taper, résultats attendus) | S15-16 |
| `security_report.md` | Résultats des tests anti-fuite PII, cas limites identifiés | S8 |

## 📎 Documents racine liés

Ces documents complètent ceux du dossier `docs/` mais sont placés à la racine du dépôt pour rester visibles immédiatement :

- [`../Architecture-GatewayIA.html`](../Architecture-GatewayIA.html) — schémas du pipeline, des couches, de la base de données et des scénarios d'usage
- [`../Plan-GatewayIA.html`](../Plan-GatewayIA.html) — plan de travail détaillé par séances (17 sessions)
- [`../ATS-GatewayIA.pdf`](../ATS-GatewayIA.pdf) — sujet officiel du stage (Réf. 01-2026)

## 🛡️ Référentiel de sécurité utilisé

Les choix de sécurité s'appuient sur :

- **RGPD / CNIL** — cadre légal sur la protection des données personnelles
- **OWASP LLM Top 10** — en particulier LLM01 (Prompt Injection), LLM02 (Insecure Output Handling), LLM06 (Sensitive Information Disclosure)
- **OWASP API Security Top 10** — pour l'audit général des routes de l'API

## ✍️ Convention de rédaction

Chaque ADR suit le format court : **Contexte** (le problème à trancher) → **Décision** (le choix fait) → **Conséquences** (avantages/limites assumés). Garder chaque entrée sur une demi-page maximum.