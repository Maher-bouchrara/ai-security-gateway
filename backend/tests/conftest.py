import pytest
import pytest_asyncio
from models.database import init_db, engine, Base


@pytest.fixture(scope="session")
def event_loop_policy():
    import asyncio
    return asyncio.DefaultEventLoopPolicy()


@pytest_asyncio.fixture(autouse=True, scope="session")
async def setup_database():
    """Crée toutes les tables avant les tests, les supprime après."""
    await init_db()
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)