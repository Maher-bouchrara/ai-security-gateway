from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from models.schemas import ChatRequest, ChatResponse
from services.llm_client import send_to_llm
from contextlib import asynccontextmanager
from models.database import init_db

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Serveur en démarrage")
    print("🚀 Swagger: http://localhost:8000/docs ")
    
    await init_db()
    print("✅ DB prête")    
    
    yield
    
    print("🛑 Serveur arrêté proprement")
    
# lifespan est un gestionnaire de cycle de vie FastAPI : 
#     tout ce qui est avant le yield s'exécute au démarrage du serveur, 
#     tout ce qui serait après s'exécute à l'arrêt. 
#     Ici, init_db() crée les tables vault_tokens et audit_events (si elles n'existent pas déjà)
#     dès que uvicorn démarre — pas besoin de script séparé à lancer à la main.

app = FastAPI(title="Gateway IA - Sécurité & Anonymisation", lifespan=lifespan)

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