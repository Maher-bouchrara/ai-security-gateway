from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from datetime import datetime, timezone
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from datetime import datetime

DATABASE_URL = "sqlite+aiosqlite:///./gateway.db"

#Crée la connexion avec la base de données.
engine = create_async_engine(DATABASE_URL, echo=False)

#AsyncSession => Une session est une connexion logique avec la DB. Elle permet de faire : INSERT,SELECT,UPDATE,DELETE.
async_session = async_sessionmaker(engine, expire_on_commit=False)

#Permet de créer la classe de base pour Les modèles SQL.
Base = declarative_base()
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String(120), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(16), default="viewer")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    
class VaultToken(Base):
    __tablename__ = "vault_tokens"
    id = Column(Integer, primary_key=True)
    token = Column(String(64), index=True)
    original_value = Column(String, nullable=False)
    entity_type = Column(String(32), nullable=False)
    session_id = Column(String(64), index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))
    expires_at = Column(DateTime, nullable=False)

class AuditEvent(Base):
    __tablename__ = "audit_events"
    id = Column(Integer, primary_key=True)
    session_id = Column(String(64), index=True)
    event_type = Column(String(32), nullable=False)
    severity = Column(String(16), nullable=False)
    pii_count = Column(Integer, default=0)
    risk_score = Column(Float, default=0.0)
    latency_ms = Column(Integer, default=0)
    blocked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None))

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)