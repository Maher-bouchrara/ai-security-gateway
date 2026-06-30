import pytest
from crud import log_event, get_events


async def test_log_event():
    event = await log_event(
        session_id="session-pytest",
        event_type="NORMAL",
        severity="low"
    )
    assert event.id is not None
    assert event.event_type == "NORMAL"


async def test_get_events():
    events = await get_events(limit=5)
    assert isinstance(events, list)