from sqlalchemy import select
from models.database import async_session, AuditEvent


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


async def get_events(limit: int = 50):
    async with async_session() as db:
        result = await db.execute(select(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(limit))
        return result.scalars().all()