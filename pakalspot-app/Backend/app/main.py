from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, spots, photos, utils, media
from app.core.database import engine
from app.models import Base
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, PROCESS_COLLECTOR, REGISTRY
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

# Include media router first (before StaticFiles mount) so it takes precedence
# This allows serving images from S3 while still supporting local files as fallback
app.include_router(media.router)

# Mount static files as fallback for locally stored files
app.mount("/media", StaticFiles(directory="media"), name="media")

app.include_router(auth.router, prefix="/api")
app.include_router(spots.router, prefix="/api")
app.include_router(photos.router, prefix="/api")
app.include_router(utils.router, prefix="/api")

app_requests_total = Counter(
    "app_requests_total",
    "Total number of requests to the PakalSpot backend"
)

@app.middleware("http")
async def count_requests(request: Request, call_next):
    app_requests_total.inc()
    response = await call_next(request)
    return response

# Enable process metrics (CPU, memory) for Prometheus
# Remove default process collector and add our own to avoid conflicts
try:
    REGISTRY.unregister(PROCESS_COLLECTOR)
except KeyError:
    pass  # Already unregistered or not registered
REGISTRY.register(PROCESS_COLLECTOR)

Instrumentator().instrument(app).expose(app)

# Lazy database initialization - non-blocking to allow health checks to pass
# even if database is temporarily unreachable
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup (non-blocking)."""
    try:
        Base.metadata.create_all(bind=engine)
        logging.info("Database tables initialized successfully")
    except Exception as e:
        # Log but don't crash - allows health check to pass
        logging.warning(f"Database initialization deferred: {e}")

@app.get("/")
def root():
    return {"message": "Welcome to PakalSpot API"}

@app.get("/health")
@app.get("/api/health")
def health(deep: bool = False):
    """Health check endpoint. Use ?deep=1 for DB connectivity check."""
    from datetime import datetime
    from sqlalchemy import text
    
    status = {"status": "ok", "timestamp": datetime.utcnow().isoformat()}
    
    if deep:
        # Optional deep check - test DB connectivity
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            status["database"] = "connected"
        except Exception as e:
            status["database"] = f"error: {str(e)[:100]}"
            # Still return 200 - service is up, DB is just unreachable
    
    return status