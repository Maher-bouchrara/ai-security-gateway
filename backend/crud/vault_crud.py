from datetime import datetime, timedelta
from sqlalchemy import select, delete
from models.database import async_session, VaultToken


async def create_token(token: str, original_value: str, entity_type: str, session_id: str, ttl_hours: int = 24):
    async with async_session() as db: # pour ouvrir la session
        new_token = VaultToken(
            token=token,
            original_value=original_value,
            entity_type=entity_type,
            session_id=session_id,
            expires_at=datetime.utcnow() + timedelta(hours=ttl_hours),
        )
        db.add(new_token)
        await db.commit()
        return new_token


async def get_token(token: str):
    async with async_session() as db:
        result = await db.execute(select(VaultToken).where(VaultToken.token == token))
        return result.scalar_one_or_none()


async def delete_expired_tokens():
    async with async_session() as db:
        await db.execute(delete(VaultToken).where(VaultToken.expires_at < datetime.utcnow()))
        await db.commit()