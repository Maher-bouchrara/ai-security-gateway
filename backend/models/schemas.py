from pydantic import BaseModel # pour la data validation et la sérialisation(parsing).
from typing import Optional # indiquer qu’une variable peut avoir une valeur OU être None.

class ChatRequest(BaseModel):
    message: str
    user_id: str
    session_id: str # si on veut utiliser optional => session_id: Optional[str]

class ChatResponse(BaseModel):
    reply: str
    llm_tokens_used: int = 0 
    pii_detected: int = 0

# Auth
class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

# Audit
class AuditEventSchema(BaseModel):
    id: int
    session_id: str
    event_type: str
    severity: str
    pii_count: int
    risk_score: float
    latency_ms: int
    blocked: bool
    created_at: str

    class Config:
        from_attributes = True

class AuditStatsSchema(BaseModel):
    total_events: int
    total_pii_detected: int
    total_blocked: int
    avg_latency_ms: float
    events_by_type: dict