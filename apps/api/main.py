"""
Financial Decision Lab (FDL) - FastAPI Backend
Provides deterministic finance calculations, multi-bank statement parsing, ML categorization,
upcoming payment calendars, anomaly detection, and evidence-linked affordability decisioning.
"""

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
    anomalies
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

# Enable CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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

@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "service": "Financial Decision Lab API",
        "version": "1.0.0",
        "currency": "INR (paise minor units)"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
