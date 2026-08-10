from datetime import datetime, timedelta, timezone
from sqlalchemy import select, delete
from models.database import async_session, VaultToken


async def create_token(token: str, original_value: str,
                       entity_type: str, session_id: str,
                       ttl_hours: int = 24):
    async with async_session() as db:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        new_token = VaultToken(
            token=token,
            original_value=original_value,
            entity_type=entity_type,
            session_id=session_id,
            created_at=now,
            expires_at=now + timedelta(hours=ttl_hours),
        )
        db.add(new_token)
        await db.commit()
        return new_token


async def save_mapping(mapping: dict, session_id: str):
    async with async_session() as db:
        for token, original_value in mapping.items():
            existing = await db.execute(
                select(VaultToken).where(
                    VaultToken.token == token,
                    VaultToken.session_id == session_id
                )
            )
            if existing.scalar_one_or_none() is not None:
                continue

            entity_type = token.strip("[]").rsplit("_", 1)[0]
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            db.add(VaultToken(
                token=token,
                original_value=original_value,
                entity_type=entity_type,
                session_id=session_id,
                created_at=now,
                expires_at=now + timedelta(hours=24),
            ))
        await db.commit()

async def get_mapping(session_id: str) -> dict:
    """Récupère tout le mapping d'une session depuis le Vault (tokens non expirés)."""
    async with async_session() as db:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = await db.execute(
            select(VaultToken).where(
                VaultToken.session_id == session_id,
                VaultToken.expires_at > now
            )
        )
        tokens = result.scalars().all()
        return {t.token: t.original_value for t in tokens}


async def get_token(token: str):
    async with async_session() as db:
        result = await db.execute(
            select(VaultToken).where(VaultToken.token == token)
        )
        return result.scalar_one_or_none()


async def delete_expired_tokens():
    async with async_session() as db:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        await db.execute(
            delete(VaultToken).where(VaultToken.expires_at < now)
        )
        await db.commit()