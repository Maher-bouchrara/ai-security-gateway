from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider

# --- Configuration SpaCy FR ---
configuration = {
    "nlp_engine_name": "spacy",
    "models": [{"lang_code": "fr", "model_name": "fr_core_news_md"}],
}
provider = NlpEngineProvider(nlp_configuration=configuration)
nlp_engine = provider.create_engine()

analyzer = AnalyzerEngine(
    nlp_engine=nlp_engine,
    supported_languages=["fr"]
)

# --- Custom Recognizer : Téléphone Tunisien (local + international) ---
phone_tn_recognizer = PatternRecognizer(
    supported_entity="PHONE_NUMBER_TN",
    supported_language="fr",
    patterns=[
        Pattern(
            name="phone_tn_international",
            regex=r"\+216\s?\d{2}\s?\d{3}\s?\d{3}",
            score=0.85
        ),
        Pattern(
            name="phone_tn_local",
            regex=r"\b(2|4|5|7|9)\d\s?\d{3}\s?\d{3}\b",
            score=0.75
        ),
    ],
    context=["numéro", "téléphone", "appel", "mobile", "tel", "tél", "contact"]
)

# --- Custom Recognizer : IBAN Tunisien ---
iban_tn_recognizer = PatternRecognizer(
    supported_entity="IBAN_CODE_TN",
    supported_language="fr",
    patterns=[
        Pattern(
            name="iban_tn",
            regex=r"TN\d{2}[\d\s]{20,28}",
            score=0.95
        ),
    ],
    context=["iban", "compte", "virement", "bancaire", "bank"]
)

# --- Custom Recognizer : CIN Tunisien ---
cin_tn_recognizer = PatternRecognizer(
    supported_entity="CIN_TN",
    supported_language="fr",
    patterns=[
        Pattern(
            name="cin_tn",
            regex=r"\b\d{8}\b",
            score=0.65
        ),
    ],
    context=["cin", "carte", "identité", "identite", "national", "pièce"]
)

# --- Custom Recognizer : Téléphone Français (format local) ---
phone_fr_recognizer = PatternRecognizer(
    supported_entity="PHONE_NUMBER_FR",
    supported_language="fr",
    patterns=[
        Pattern(
            name="phone_fr_local",
            regex=r"\b0[1-9](\s?\d{2}){4}\b",
            score=0.85
        ),
        Pattern(
            name="phone_fr_international",
            regex=r"\+33\s?[1-9](\s?\d{2}){4}",
            score=0.90
        ),
    ],
    context=["numéro", "téléphone", "appel", "mobile", "tel", "tél", "contact"]
)

# --- Ajouter les recognizers custom à Presidio ---
analyzer.registry.add_recognizer(phone_tn_recognizer)
analyzer.registry.add_recognizer(iban_tn_recognizer)
analyzer.registry.add_recognizer(cin_tn_recognizer)
analyzer.registry.add_recognizer(phone_fr_recognizer)


class PIIDetector:
    """Détecte les entités PII dans un texte en français et arabe (FR + TN)."""

    # Entités à détecter — natives + custom
    ENTITIES = [
        "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER",
        "PHONE_NUMBER_FR", "PHONE_NUMBER_TN",
        "IBAN_CODE", "IBAN_CODE_TN",
        "CIN_TN", "LOCATION", "DATE_TIME",
        "CREDIT_CARD", "URL", "IP_ADDRESS", "NRP",
    ]

    def analyze(self, text: str) -> list:
        results = analyzer.analyze(
            text=text,
            language="fr",
            entities=self.ENTITIES
        )
        # Filtre 1 : supprimer faux positif LOCATION sur codes courts (ex. "FR76")
        results = [
            r for r in results
            if not (r.entity_type == "LOCATION" and r.end - r.start <= 6)
        ]
        # Filtre 2 : dédupliquer — si deux entités couvrent la même zone,
        # garder celle avec le score le plus élevé
        filtered = []
        for r in results:
            overlap = [
                x for x in filtered
                if x.start < r.end and x.end > r.start
            ]
            if not overlap:
                filtered.append(r)
            else:
                # remplacer si le nouveau score est meilleur
                for x in overlap:
                    if r.score > x.score:
                        filtered.remove(x)
                        filtered.append(r)

        return filtered