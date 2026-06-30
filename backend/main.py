from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import ChatRequest, ChatResponse
from services.llm_client import send_to_llm

app = FastAPI(title="Gateway IA - Sécurité & Anonymisation")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # URL du futur frontend Vite
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    reply = send_to_llm(request.message)
    return ChatResponse(reply=reply)