"""
Financial Decision Lab (FDL) - FastAPI Backend
Provides deterministic finance calculations, multi-bank statement parsing, ML categorization,
upcoming payment calendars, anomaly detection, and evidence-linked affordability decisioning.
"""

import os
import sys
from pathlib import Path

# Ensure backend root directory is in sys.path for serverless runtimes
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from dotenv import load_dotenv

# Auto-load .env and .env.local from project root or workspace
for candidate in [
    Path(".env.local"),
    Path(".env"),
    Path(__file__).resolve().parent / ".env.local",
    Path(__file__).resolve().parent / ".env",
    Path(__file__).resolve().parent.parent.parent / ".env.local",
    Path(__file__).resolve().parent.parent.parent / ".env",
]:
    if candidate.exists():
        load_dotenv(candidate, override=False)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from db.database import init_db
from routers import (
    affordability,
    imports,
    transactions,
    whatif,
    dashboard,
    sufficiency,
    recurring,
    anomalies,
    privacy,
    internal_auth,
    email_sync,
    investments,
    tax,
    goals
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database on startup
    init_db()
    yield

app = FastAPI(
    title="Financial Decision Lab API",
    description="A Personal Finance Assistant That Shows Its Work — 'Can I afford this next month?'",
    version="1.0.0",
    lifespan=lifespan
)

# Build CORS origin allowlist — always includes localhost for dev, plus any
# production / staging origins declared in environment variables.
_cors_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Production Vercel deployment
    "https://iste-version-beta-beta-1.vercel.app",
]
# Allow overriding / extending via env vars (comma-separated)
_frontend_url = os.getenv("FRONTEND_URL", "").strip()
if _frontend_url:
    for _origin in _frontend_url.split(","):
        _origin = _origin.strip().rstrip("/")
        if _origin and _origin not in _cors_origins:
            _cors_origins.append(_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(imports.router, prefix="/api/imports", tags=["Statement Ingestion"])
app.include_router(transactions.router, prefix="/api/transactions", tags=["Transactions & Corrections"])
app.include_router(affordability.router, prefix="/api/affordability", tags=["Affordability & Ask"])
app.include_router(whatif.router, prefix="/api/scenarios", tags=["What-If Lab"])
app.include_router(sufficiency.router, prefix="/api/sufficiency", tags=["Data Sufficiency Gate"])
app.include_router(recurring.router, prefix="/api/recurring", tags=["Recurring Commitments"])
app.include_router(anomalies.router, prefix="/api/anomalies", tags=["Anomaly Detection"])
app.include_router(privacy.router, prefix="/api/privacy", tags=["Privacy & Egress"])
app.include_router(internal_auth.router, prefix="/api", tags=["Internal User Persistence"])
app.include_router(email_sync.router, prefix="/api/email-sync", tags=["Email Sync & OAuth"])
app.include_router(investments.router, prefix="/api/investments", tags=["Investments & Liquidity Advisor"])
app.include_router(tax.router, prefix="/api/tax", tags=["Tax Intelligence"])
app.include_router(goals.router, prefix="/api/goals", tags=["Goals & Recurring Optimizer"])

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Financial Decision Lab API",
        "version": "1.0.0",
        "storage": "sqlite",
        "privacy_mode": "local"
    }
