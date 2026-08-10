import re
import time
from dataclasses import dataclass
from llm_guard.input_scanners import PromptInjection
from llm_guard.input_scanners.prompt_injection import MatchType
from llm_guard.output_scanners import Toxicity


@dataclass
class ScanResult:
    is_safe: bool
    risk_score: float
    blocked_reason: str = ""
    latency_ms: int = 0


# Patterns d'injection connus — regex simples et fiables
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|your)\s+instructions",
    r"forget\s+(everything|all)\s+(you\s+)?(were\s+told|know)",
    r"you\s+are\s+now\s+(DAN|an?\s+AI\s+without)",
    r"act\s+as\s+(if\s+you\s+have\s+no|an?\s+unrestricted)",
    r"pretend\s+you\s+(are|have)\s+no\s+(restrictions|content\s+policy)",
    r"(disable|bypass|override)\s+(all\s+)?(filters?|restrictions?|rules?|guidelines?)",
    r"###\s*(ADMIN|SYSTEM)\s*(OVERRIDE|INSTRUCTION)",
    r"\[SYSTEM\].*new\s+instructions",
    r"oublie\s+(tout|tes\s+instructions)",
    r"ignore\s+tes\s+instructions",
    r"tu\s+es\s+maintenant\s+(un\s+assistant\s+sans|DAN)",
    r"sans\s+aucune\s+(restriction|règle|contrainte)",
    r"from\s+now\s+on\s+you\s+will\s+respond\s+as",
]

# Mots-clés PII — si le message en contient, on baisse le seuil LLM Guard
# car ces patterns perturbent le modèle
PII_CONTEXT_WORDS = [
    "email", "téléphone", "telephone", "iban", "cin", "numéro",
    "numero", "adresse", "nom", "prénom", "prenom", "identité",
    "identite", "passeport", "carte", "bancaire", "virement"
]


class InputScanner:
    """Scanner hybride : regex rapides + LLM Guard pour les cas ambigus."""

    def __init__(self):
        self.llm_guard_scanner = PromptInjection(
            match_type=MatchType.FULL,
            threshold=0.99
        )
        self.patterns = [
            re.compile(p, re.IGNORECASE | re.DOTALL)
            for p in INJECTION_PATTERNS
        ]

    def _contains_pii_context(self, text: str) -> bool:
        """Vérifie si le texte parle de données personnelles."""
        text_lower = text.lower()
        return any(word in text_lower for word in PII_CONTEXT_WORDS)

    def _regex_scan(self, text: str) -> ScanResult:
        """Scan rapide par regex — détecte les patterns d'injection connus."""
        for pattern in self.patterns:
            if pattern.search(text):
                return ScanResult(
                    is_safe=False,
                    risk_score=1.0,
                    blocked_reason="prompt_injection_pattern"
                )
        return ScanResult(is_safe=True, risk_score=0.0)

    def scan(self, prompt: str) -> ScanResult:
        start = time.perf_counter()

        # Étape 1 — Regex d'abord (rapide, fiable, pas de faux positifs)
        regex_result = self._regex_scan(prompt)
        if not regex_result.is_safe:
            return ScanResult(
                is_safe=False,
                risk_score=1.0,
                blocked_reason="prompt_injection_pattern",
                latency_ms=int((time.perf_counter() - start) * 1000)
            )

        # Étape 2 — Si le message contient du contexte PII,
        # on skip LLM Guard (trop de faux positifs sur ce type de contenu)
        if self._contains_pii_context(prompt):
            return ScanResult(
                is_safe=True,
                risk_score=0.0,
                latency_ms=int((time.perf_counter() - start) * 1000)
            )

        # Étape 3 — LLM Guard pour les messages sans contexte PII
        _, is_valid, risk_score = self.llm_guard_scanner.scan(prompt=prompt)
        latency_ms = int((time.perf_counter() - start) * 1000)

        if not is_valid:
            return ScanResult(
                is_safe=False,
                risk_score=risk_score,
                blocked_reason="prompt_injection",
                latency_ms=latency_ms
            )

        return ScanResult(is_safe=True, risk_score=risk_score, latency_ms=latency_ms)


class OutputScanner:
    """Scanne la réponse du LLM pour détecter la toxicité."""

    def __init__(self):
        self.toxicity_scanner = Toxicity()

    def scan(self, prompt: str, response: str) -> ScanResult:
        start = time.perf_counter()
        _, is_valid, risk_score = self.toxicity_scanner.scan(
            prompt=prompt, output=response
        )
        latency_ms = int((time.perf_counter() - start) * 1000)

        if not is_valid:
            return ScanResult(
                is_safe=False,
                risk_score=risk_score,
                blocked_reason="toxic_output",
                latency_ms=latency_ms
            )
        return ScanResult(is_safe=True, risk_score=risk_score, latency_ms=latency_ms)