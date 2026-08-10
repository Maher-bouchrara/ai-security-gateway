from sqlalchemy import select
from models.database import async_session, AuditEvent
from typing import Optional


async def log_event(session_id: str, event_type: str, severity: str = "low",
                     pii_count: int = 0, risk_score: float = 0.0,
                     latency_ms: int = 0, blocked: bool = False):
    async with async_session() as db:
        event = AuditEvent(
            session_id=session_id, event_type=event_type, severity=severity,
            pii_count=pii_count, risk_score=risk_score,
            latency_ms=latency_ms, blocked=blocked,
        )
        db.add(event)
        await db.commit()
        return event

async def get_events(limit: int = 50, offset: int = 0,
                     event_type: Optional[str] = None) -> list:
    async with async_session() as db:
        query = select(AuditEvent).order_by(AuditEvent.created_at.desc())
        if event_type:
            query = query.where(AuditEvent.event_type == event_type)
        query = query.limit(limit).offset(offset)
        result = await db.execute(query)
        return result.scalars().all()