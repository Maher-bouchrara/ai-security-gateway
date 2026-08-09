from dataclasses import dataclass, field
from presidio_analyzer import AnalyzerEngine, PatternRecognizer, Pattern
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

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
anonymizer_engine = AnonymizerEngine()

# --- Custom Recognizers ---
phone_tn_recognizer = PatternRecognizer(
    supported_entity="PHONE_NUMBER_TN",
    supported_language="fr",
    patterns=[
        Pattern("phone_tn_international", r"\+216\s?\d{2}\s?\d{3}\s?\d{3}", 0.85),
        Pattern("phone_tn_local", r"\b(2|4|5|7|9)\d\s?\d{3}\s?\d{3}\b", 0.75),
    ],
    context=["numéro", "téléphone", "appel", "mobile", "tel", "tél", "contact"]
)

iban_tn_recognizer = PatternRecognizer(
    supported_entity="IBAN_CODE_TN",
    supported_language="fr",
    patterns=[Pattern("iban_tn", r"TN\d{2}[\d\s]{20,28}", 0.95)],
    context=["iban", "compte", "virement", "bancaire", "bank"]
)

cin_tn_recognizer = PatternRecognizer(
    supported_entity="CIN_TN",
    supported_language="fr",
    patterns=[Pattern("cin_tn", r"\b\d{8}\b", 0.65)],
    context=["cin", "carte", "identité", "identite", "national", "pièce"]
)

phone_fr_recognizer = PatternRecognizer(
    supported_entity="PHONE_NUMBER_FR",
    supported_language="fr",
    patterns=[
        Pattern("phone_fr_local", r"\b0[1-9](\s?\d{2}){4}\b", 0.85),
        Pattern("phone_fr_international", r"\+33\s?[1-9](\s?\d{2}){4}", 0.90),
    ],
    context=["numéro", "téléphone", "appel", "mobile", "tel", "tél", "contact"]
)

analyzer.registry.add_recognizer(phone_tn_recognizer)
analyzer.registry.add_recognizer(iban_tn_recognizer)
analyzer.registry.add_recognizer(cin_tn_recognizer)
analyzer.registry.add_recognizer(phone_fr_recognizer)


@dataclass
class AnonymizeResult:
    """Résultat de l'anonymisation : texte tokenisé + mapping token → valeur réelle."""
    anonymized_text: str
    mapping: dict = field(default_factory=dict)  # ex. {"[PERSONNE_1]": "Marie Martin"}
    entity_count: int = 0


class PIIDetector:
    """Détecte, anonymise et désanonymise les PII (FR + TN)."""

    ENTITIES = [
        "PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER",
        "PHONE_NUMBER_FR", "PHONE_NUMBER_TN",
        "IBAN_CODE", "IBAN_CODE_TN",
        "CIN_TN", "LOCATION", "DATE_TIME",
        "CREDIT_CARD", "URL", "IP_ADDRESS", "NRP",
    ]

    def analyze(self, text: str) -> list:
        """Détecte les PII et retourne les résultats dédupliqués."""
        results = analyzer.analyze(
            text=text,
            language="fr",
            entities=self.ENTITIES
        )
        # Supprimer faux positif LOCATION sur codes courts
        results = [
            r for r in results
            if not (r.entity_type == "LOCATION" and r.end - r.start <= 6)
        ]
        # Dédupliquer : garder le score le plus élevé par zone
        filtered = []
        for r in results:
            overlap = [x for x in filtered if x.start < r.end and x.end > r.start]
            if not overlap:
                filtered.append(r)
            else:
                for x in overlap:
                    if r.score > x.score:
                        filtered.remove(x)
                        filtered.append(r)
        return filtered

    def anonymize(self, text: str) -> AnonymizeResult:
        """
        Remplace les PII par des tokens et retourne le texte anonymisé + le mapping.
        Ex: "Marie Martin" → "[PERSONNE_1]", mapping = {"[PERSONNE_1]": "Marie Martin"}
        """
        analysis_results = self.analyze(text)

        if not analysis_results:
            return AnonymizeResult(anonymized_text=text, mapping={}, entity_count=0)

        # Compteurs par type d'entité pour numéroter les tokens
        counters = {}
        mapping = {}

        # Trier par position dans le texte (début → fin, inversé pour remplacer sans décalage)
        sorted_results = sorted(analysis_results, key=lambda x: x.start, reverse=True)

        anonymized = text
        for result in sorted_results:
            entity_type = result.entity_type
            counters[entity_type] = counters.get(entity_type, 0) + 1
            token = f"[{entity_type}_{counters[entity_type]}]"
            original_value = text[result.start:result.end]
            mapping[token] = original_value
            # Remplacer dans le texte
            anonymized = anonymized[:result.start] + token + anonymized[result.end:]

        return AnonymizeResult(
            anonymized_text=anonymized,
            mapping=mapping,
            entity_count=len(mapping)
        )

    def deanonymize(self, text: str, mapping: dict) -> str:
        """
        Réinjecte les vraies valeurs dans un texte tokenisé.
        Ex: "[PERSONNE_1]" → "Marie Martin"
        """
        result = text
        for token, original_value in mapping.items():
            result = result.replace(token, original_value)
        return result