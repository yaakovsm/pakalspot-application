from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, spots, photos, utils, media
from app.core.database import engine
from app.models import Base
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter

Base.metadata.create_all(bind=engine)

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

Instrumentator().instrument(app).expose(app)

@app.get("/")
def root():
    return {"message": "Welcome to PakalSpot API"}

@app.get("/health")
@app.get("/api/health")
def health():
    """Health check endpoint for Kubernetes probes."""
    return {"status": "ok"}