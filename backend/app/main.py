from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import HTTPException

from app.routes.recommend import router as recommend_router
from app.routes.chat import router as chat_router
from app.routes.user import router as user_router
from app.services.data_service import fetch_rfps

app = FastAPI(title="Black BRAND Backend")


def get_allowed_origins():
    configured = os.environ.get("CORS_ORIGINS", "")
    origins = [origin.strip() for origin in configured.split(",") if origin.strip()]

    frontend_url = os.environ.get("FRONTEND_URL", "").strip()
    if frontend_url and frontend_url not in origins:
        origins.append(frontend_url)

    return origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(user_router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Black BRAND backend is running"}


@app.get("/test-supabase")
def test_supabase():
    try:
        rfps = fetch_rfps(limit=5)
        return {
            "connected": True,
            "count": len(rfps),
            "sample": rfps[:2],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
