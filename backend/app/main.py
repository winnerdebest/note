from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.routers import auth_router, notes_router
# Import models to ensure they are registered with Base.metadata
import app.models

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database tables exist
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables verified / created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")
    yield

app = FastAPI(
    title="Notes by Winner API",
    description="FastAPI Backend for Notes by Winner (Web & Android)",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS for Web and Mobile clients (supports Render & custom frontend domains)
raw_origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
allow_all = "*" in raw_origins or not raw_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else raw_origins,
    allow_origin_regex=".*" if allow_all else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(notes_router)

@app.get("/", tags=["Health"])
def root():
    return {
        "status": "online",
        "service": "NoteApp Backend API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
