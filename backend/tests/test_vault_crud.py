import pytest
from crud import create_token, get_token, delete_expired_tokens
from datetime import datetime, timedelta


async def test_create_and_get_token():
    await create_token("[TEST_TOKEN]", "Valeur Test", "PERSON", "session-pytest")
    token = await get_token("[TEST_TOKEN]")

    assert token is not None
    assert token.original_value == "Valeur Test"
    assert token.entity_type == "PERSON"


async def test_get_nonexistent_token():
    token = await get_token("[TOKEN_INEXISTANT]")
    assert token is None