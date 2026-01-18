from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, spots, photos, utils, media, admin
from app.core.database import engine
from app.models import Base
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, PROCESS_COLLECTOR, REGISTRY
import os
import logging

app = FastAPI(
    title="PakalSpot API",
    description="API backend for PakalSpot (coffee spots in Israel)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router, prefix="/api")
# Static file mount removed - media router handles all /api/media requests

app.include_router(auth.router, prefix="/api")
app.include_router(spots.router, prefix="/api")
app.include_router(photos.router, prefix="/api")
app.include_router(utils.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

app_requests_total = Counter(
    "app_requests_total",
    "Total number of requests to the PakalSpot backend"
)

@app.middleware("http")
async def count_requests(request: Request, call_next):
    app_requests_total.inc()
    response = await call_next(request)
    return response

try:
    REGISTRY.unregister(PROCESS_COLLECTOR)
except KeyError:
    pass
REGISTRY.register(PROCESS_COLLECTOR)

Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
async def startup_event():
    """
    Do NOT auto-create tables by default.
    Alembic should manage schema.
    Enable only if you explicitly want it: AUTO_CREATE_TABLES=true
    """
    if os.getenv("AUTO_CREATE_TABLES", "false").lower() == "true":
        try:
            Base.metadata.create_all(bind=engine)
            logging.info("Database tables auto-created (AUTO_CREATE_TABLES=true)")
        except Exception as e:
            logging.warning(f"Auto-create tables failed: {e}")
    else:
        logging.info("Skipping Base.metadata.create_all (Alembic manages schema)")

@app.get("/")
def root():
    return {"message": "Welcome to PakalSpot API"}

@app.get("/health")
@app.get("/api/health")
def health(deep: bool = False):
    from datetime import datetime
    from sqlalchemy import text

    status = {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

    if deep:
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            status["database"] = "connected"
        except Exception as e:
            status["database"] = f"error: {str(e)[:100]}"

    return status
