# Spécification des entités PII détectées

## Format de tokenisation
`[TYPE_NUMERO]` — ex. `[PERSONNE_1]`, `[EMAIL_1]`, `[IBAN_CODE_TN_1]`

## Entités détectées

| # | Entité | Type interne | Exemple FR | Exemple TN | Score | Source |
|---|---|---|---|---|---|---|
| 1 | Nom complet | `PERSON` | Marie Martin | Mohamed Ben Ali | 0.85 | SpaCy FR |
| 2 | Email | `EMAIL_ADDRESS` | marie@email.com | med@gmail.com | 0.99 | Presidio natif |
| 3 | Téléphone FR | `PHONE_NUMBER_FR` | +33 6 12 34 56 78 | — | 1.00 | Custom regex |
| 4 | Téléphone FR local | `PHONE_NUMBER_FR` | 06 12 34 56 78 | — | 0.85 | Custom regex |
| 5 | Téléphone TN | `PHONE_NUMBER_TN` | — | +216 22 123 456 | 1.00 | Custom regex |
| 6 | Téléphone TN local | `PHONE_NUMBER_TN` | — | 22 123 456 | 0.75 | Custom regex |
| 7 | IBAN France | `IBAN_CODE` | FR76 3000... | — | 1.00 | Presidio natif |
| 8 | IBAN Tunisie | `IBAN_CODE_TN` | — | TN59 1000... | 1.00 | Custom regex |
| 9 | CIN Tunisien | `CIN_TN` | — | 12345678 | 0.65 | Custom regex |
| 10 | Carte de crédit | `CREDIT_CARD` | 4111 1111... | — | 0.99 | Presidio natif |
| 11 | Adresse IP | `IP_ADDRESS` | 192.168.1.1 | — | 0.95 | Presidio natif |
| 12 | URL | `URL` | https://... | — | 0.95 | Presidio natif |
| 13 | Date | `DATE_TIME` | 12/03/1990 | — | 0.85 | Presidio natif |
| 14 | Localisation | `LOCATION` | Paris, Lyon | Tunis, Sfax | 0.85 | SpaCy FR |

## Cas limites identifiés
- `CIN_TN` : score 0.65 — nécessite le mot-clé "CIN" dans le contexte pour être fiable
- `LOCATION` : faux positifs sur codes IBAN courts (ex. "FR76") — filtrés automatiquement
- `PHONE_NUMBER` natif Presidio gardé en fallback mais dédupliqué si custom recognizer présent