from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, spots, photos, utils
from app.core.database import engine, Base

# Create DB tables if not using Alembic yet
# (when you add migrations, you can remove this line)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PakalSpot API",
    description="API backend for PakalSpot (coffee spots in Israel)",
    version="1.0.0",
)

# CORS setup (allow frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # TODO: restrict to your frontend domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router)
app.include_router(spots.router)
app.include_router(photos.router)
app.include_router(utils.router)


@app.get("/")
def root():
    return {"message": "Welcome to PakalSpot API 🚀"}
