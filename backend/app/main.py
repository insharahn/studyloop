from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.ingestion.embedder import preload_model as preload_embedder
from app.retrieval.rerank import preload_model as preload_reranker
from app.routers import chat, concepts, cards
from app.routers import courses, documents, review, stats  

@asynccontextmanager
async def lifespan(app: FastAPI):
    preload_embedder()
    preload_reranker()
    yield


app = FastAPI(title="StudyLoop API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}


app.include_router(chat.router)
app.include_router(concepts.router)
app.include_router(cards.router)
app.include_router(courses.router)
app.include_router(documents.router)
app.include_router(review.router)
app.include_router(stats.router)