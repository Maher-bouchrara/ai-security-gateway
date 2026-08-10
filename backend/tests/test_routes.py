from fastapi.testclient import TestClient
from unittest.mock import patch
from main import app

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@patch("main.send_to_llm")
def test_chat(mock_send_to_llm):
    mock_send_to_llm.return_value = ("Réponse simulée du LLM", 100)  # ← tuple

    response = client.post("/chat", json={
        "message": "Bonjour",
        "user_id": "user-test",
        "session_id": "session-test"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Réponse simulée du LLM"
    mock_send_to_llm.assert_called_once()
    