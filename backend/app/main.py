"""FastAPI application entrypoint for AI Trading Master auth."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .database import init_db
from .routers import auth

# Repo root (contains the single-page frontend): backend/app/main.py -> repo root
FRONTEND_DIR = Path(__file__).resolve().parents[2]
# Everything lives in one page now (landing + auth + app).
FRONTEND_FILES = {
    "/": "index.html",
    "/index.html": "index.html",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AI Trading Master — Auth API",
    version="1.0.0",
    description="Authentication service: register, login, email verification, "
    "password reset, and JWT (access + rotating refresh) tokens.",
    lifespan=lifespan,
)

origins = ["*"] if settings.CORS_ORIGINS.strip() == "*" else [
    o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health():
    return {"status": "healthy"}


app.include_router(auth.router)


# --- Serve the frontend HTML files (landing, auth, demo app) from the same origin ---
def _serve(filename: str):
    def handler():
        path = FRONTEND_DIR / filename
        if not path.exists():
            raise HTTPException(status_code=404, detail=f"{filename} not found")
        return FileResponse(path)

    return handler


for _route, _file in FRONTEND_FILES.items():
    app.add_api_route(_route, _serve(_file), include_in_schema=False)
