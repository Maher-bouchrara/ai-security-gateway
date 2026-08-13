from contextlib import asynccontextmanager
from typing import Optional
from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from crud.audit_crud import get_events
from services.llm_client import send_to_llm
from services.anonymizer import PIIDetector
from services.security_scanner import InputScanner, OutputScanner
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, select
from models.database import init_db ,async_session, AuditEvent
from models.schemas import ChatRequest, ChatResponse, LoginRequest, TokenResponse, AuditEventSchema, AuditStatsSchema
from services.auth import verify_password, create_access_token, get_current_user
from crud import save_mapping, get_mapping, log_event ,create_user, get_user_by_email
from fastapi.responses import StreamingResponse
import asyncio
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

    # Étape 2 — Scanner le message ORIGINAL
    # (Presidio peut transformer un texte d'attaque en [PERSON_1] et le cacher)
    input_scan = input_scanner.scan(request.message)
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

    # Étape 3 — Sauvegarder le mapping
    if anonymize_result.mapping:
        await save_mapping(anonymize_result.mapping, request.session_id)

    # Étape 4 — LLM (texte anonymisé)
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

    # Étape 6 — Désanonymiser
    mapping = await get_mapping(request.session_id)
    final_response = detector.deanonymize(llm_response, mapping)

    # Étape 7 — Logger
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
    
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Pipeline complet en mode streaming SSE."""

    # Étape 1 — Anonymiser
    anonymize_result = detector.anonymize(request.message)

    # Étape 2 — Scanner le message original
    input_scan = input_scanner.scan(request.message)
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

    # Étape 3 — Sauvegarder le mapping
    if anonymize_result.mapping:
        await save_mapping(anonymize_result.mapping, request.session_id)

    # Étape 4 — Récupérer le mapping pour la désanonymisation
    mapping = await get_mapping(request.session_id)

    async def generate():
        try:
            from litellm import completion
            import os

            response = completion(
                model=os.getenv("GROQ_MODEL"),
                messages=[{"role": "user", "content": anonymize_result.anonymized_text}],
                api_key=os.getenv("GROQ_API_KEY"),
                stream=True
            )

            buffer = ""

            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta is None:
                    continue

                buffer += delta

                # Envoyer seulement quand on a un mot complet
                # (quand le buffer se termine par un espace ou ponctuation)
                if buffer.endswith((" ", "\n", ".", ",", "!", "?", ":", ";")):
                    # Désanonymiser le buffer complet
                    deanonymized = buffer
                    for token, value in mapping.items():
                        deanonymized = deanonymized.replace(token, value)

                    yield f"data: {deanonymized}\n\n"
                    buffer = ""

            # Envoyer ce qui reste dans le buffer
            if buffer:
                deanonymized = buffer
                for token, value in mapping.items():
                    deanonymized = deanonymized.replace(token, value)
                yield f"data: {deanonymized}\n\n"
            
            yield f"data: [PII:{anonymize_result.entity_count}]\n\n"
            yield "data: [DONE]\n\n"

            await log_event(
                session_id=request.session_id,
                event_type="PII_DETECTED" if anonymize_result.entity_count > 0 else "NORMAL",
                severity="high" if anonymize_result.entity_count > 0 else "low",
                pii_count=anonymize_result.entity_count,
                risk_score=input_scan.risk_score,
                latency_ms=0
            )

        except Exception as e:
            yield f"data: [ERROR] {str(e)}\n\n"
        
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
       
# ─── AUTH ────────────────────────────────────────────────

@app.post("/auth/register", status_code=201)
async def register(request: LoginRequest):
    """Crée un compte (pour les tests — à supprimer en prod)."""
    existing = await get_user_by_email(request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    user = await create_user(request.email, request.password)
    return {"message": "Compte créé", "email": user.email}


@app.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """Authentifie et retourne un JWT."""
    user = await get_user_by_email(request.email)
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_access_token({"sub": user.email, "role": user.role})
    return TokenResponse(access_token=token)    

from fastapi import Depends
from fastapi.security import OAuth2PasswordRequestForm

@app.post("/auth/token", response_model=TokenResponse,include_in_schema=False)
async def login_form(form_data: OAuth2PasswordRequestForm = Depends()):
    """Route compatible formulaire Swagger OAuth2."""
    user = await get_user_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_access_token({"sub": user.email, "role": user.role})
    return TokenResponse(access_token=token)

# ─── AUDIT ───────────────────────────────────────────────

@app.get("/audit", response_model=list[AuditEventSchema])
async def get_audit(
    page: int = 1,
    limit: int = 10,
    event_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Historique paginé des événements d'audit (JWT requis)."""
    events = await get_events(limit=limit, offset=(page-1)*limit, event_type=event_type)
    return [
        AuditEventSchema(
            id=e.id,
            session_id=e.session_id,
            event_type=e.event_type,
            severity=e.severity,
            pii_count=e.pii_count,
            risk_score=e.risk_score,
            latency_ms=e.latency_ms,
            blocked=e.blocked,
            created_at=str(e.created_at)
        ) for e in events
    ]


@app.get("/audit/stats", response_model=AuditStatsSchema)
async def get_audit_stats(current_user: dict = Depends(get_current_user)):
    """Statistiques agrégées pour le dashboard (JWT requis)."""
    async with async_session() as db:
        total = await db.execute(select(func.count(AuditEvent.id)))
        total_pii = await db.execute(select(func.sum(AuditEvent.pii_count)))
        total_blocked = await db.execute(
            select(func.count(AuditEvent.id)).where(AuditEvent.blocked == True)
        )
        avg_latency = await db.execute(select(func.avg(AuditEvent.latency_ms)))
        by_type_result = await db.execute(
            select(AuditEvent.event_type, func.count(AuditEvent.id))
            .group_by(AuditEvent.event_type)
        )

    return AuditStatsSchema(
        total_events=total.scalar() or 0,
        total_pii_detected=total_pii.scalar() or 0,
        total_blocked=total_blocked.scalar() or 0,
        avg_latency_ms=round(avg_latency.scalar() or 0, 2),
        events_by_type=dict(by_type_result.fetchall())
    )