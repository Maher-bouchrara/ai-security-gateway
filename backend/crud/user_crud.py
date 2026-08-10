from sqlalchemy import select
from models.database import async_session, User
from services.auth import hash_password


async def create_user(email: str, password: str, role: str = "viewer"):
    """Crée un utilisateur avec mot de passe haché."""
    async with async_session() as db:
        user = User(
            email=email,
            hashed_password=hash_password(password),
            role=role
        )
        db.add(user)
        await db.commit()
        return user


async def get_user_by_email(email: str):
    """Récupère un utilisateur par email."""
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()