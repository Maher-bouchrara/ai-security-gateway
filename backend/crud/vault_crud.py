from datetime import datetime, timedelta
from sqlalchemy import select, delete
from models.database import async_session, VaultToken


async def create_token(token: str, original_value: str,
                       entity_type: str, session_id: str,
                       ttl_hours: int = 24):
    async with async_session() as db:
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


async def save_mapping(mapping: dict, session_id: str):
    """Sauvegarde tout le mapping token → valeur en DB d'un coup."""
    async with async_session() as db:
        for token, original_value in mapping.items():
            # Extraire le type d'entité depuis le token ex. [PERSON_1] → PERSON
            
            # Vérifier si le token existe déjà avant d'insérer
            existing = await db.execute(
                select(VaultToken).where(VaultToken.token == token)
            )
            if existing.scalar_one_or_none() is not None:
                continue  # déjà en DB, on skip
            
            entity_type = token.strip("[]").rsplit("_", 1)[0]
            db.add(VaultToken(
                token=token,
                original_value=original_value,
                entity_type=entity_type,
                session_id=session_id,
                expires_at=datetime.utcnow() + timedelta(hours=24),
            ))
        await db.commit()


async def get_mapping(session_id: str) -> dict:
    """Récupère tout le mapping d'une session depuis le Vault."""
    async with async_session() as db:
        result = await db.execute(
            select(VaultToken).where(
                VaultToken.session_id == session_id,
                VaultToken.expires_at > datetime.utcnow()
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
        await db.execute(
            delete(VaultToken).where(VaultToken.expires_at < datetime.utcnow())
        )
        await db.commit()