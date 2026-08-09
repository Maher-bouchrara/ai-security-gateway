from pydantic import BaseModel # pour la data validation et la sérialisation(parsing).
from typing import Optional # indiquer qu’une variable peut avoir une valeur OU être None.

class ChatRequest(BaseModel):
    message: str
    user_id: str
    session_id: str # si on veut utiliser optional => session_id: Optional[str]

class ChatResponse(BaseModel):
    reply: str
    llm_tokens_used: int = 0 
    pii_detected: int = 0