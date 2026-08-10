from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models.database import init_db
from models.schemas import ChatRequest, ChatResponse
from services.llm_client import send_to_llm
from services.anonymizer import PIIDetector
from services.security_scanner import InputScanner, OutputScanner
from crud import save_mapping, get_mapping, log_event
import time

detector = PIIDetector()
input_scanner = InputScanner()
output_scanner = OutputScanner()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Gateway IA - Sécurité & Anonymisation", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    start = time.perf_counter()

    # Étape 1 — Anonymiser D'ABORD
    anonymize_result = detector.anonymize(request.message)

    # Étape 2 — Scanner le texte ANONYMISÉ (plus de PII qui perturbent le scanner)
    input_scan = input_scanner.scan(anonymize_result.anonymized_text)
    if not input_scan.is_safe:
        await log_event(
            session_id=request.session_id,
            event_type="PROMPT_INJECTION",
            severity="critical",
            risk_score=input_scan.risk_score,
            latency_ms=input_scan.latency_ms,
            blocked=True
        )
        raise HTTPException(
            status_code=400,
            detail=f"Message bloqué : {input_scan.blocked_reason}"
        )

    # Étape 3 — Sauvegarder le mapping dans le Vault
    if anonymize_result.mapping:
        await save_mapping(anonymize_result.mapping, request.session_id)
    # Étape 4 — Envoyer le texte anonymisé au LLM
    llm_response, tokens_used = send_to_llm(anonymize_result.anonymized_text)

    # Étape 5 — Scan output
    output_scan = output_scanner.scan(anonymize_result.anonymized_text, llm_response)
    if not output_scan.is_safe:
        await log_event(
            session_id=request.session_id,
            event_type="TOXIC_OUTPUT",
            severity="high",
            risk_score=output_scan.risk_score,
            latency_ms=int((time.perf_counter() - start) * 1000),
            blocked=True
        )
        raise HTTPException(
            status_code=400,
            detail="Réponse bloquée : contenu toxique détecté"
        )

    # Étape 6 — Désanonymiser la réponse
    mapping = await get_mapping(request.session_id)
    final_response = detector.deanonymize(llm_response, mapping)

    # Étape 7 — Logger dans l'audit
    latency_ms = int((time.perf_counter() - start) * 1000)
    await log_event(
        session_id=request.session_id,
        event_type="PII_DETECTED" if anonymize_result.entity_count > 0 else "NORMAL",
        severity="high" if anonymize_result.entity_count > 0 else "low",
        pii_count=anonymize_result.entity_count,
        risk_score=max(input_scan.risk_score, output_scan.risk_score),
        latency_ms=latency_ms
    )

    return ChatResponse(
        reply=final_response,
        llm_tokens_used=tokens_used,
        pii_detected=anonymize_result.entity_count
    )