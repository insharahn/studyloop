# StudyLoop

Most study apps generate flashcards from your notes. StudyLoop generates them from your mistakes — tracing every wrong answer back to the actual concept you don't understand, so you spend your time fixing real gaps instead of re-reading slides you already know.

**Live:** [studyloop-nu.vercel.app](https://studyloop-nu.vercel.app)
**API:** [studyloop-production.up.railway.app](https://studyloop-production.up.railway.app)

---

## What it does

- **Upload & understand** — parses lecture PDFs, extracts the underlying concepts, and builds a prerequisite graph showing how topics depend on each other, visualized as an interactive concept map.
- **Grounded doubt-solving** — a chat interface that answers *only* from your uploaded material, with exact page citations. If your notes don't cover something, it says so instead of guessing.
- **Adaptive flashcards** — MCQ and cloze cards generated per concept, grounded in your actual course content. Scheduled with FSRS spaced repetition, prioritized against your exam date.
- **Root-cause diagnosis** — when you miss a question, StudyLoop doesn't just mark it wrong. It traces the error back through the prerequisite graph to the specific earlier concept you're actually struggling with.
- **Progress tracking** — a mastery dashboard (Class Pulse) with per-concept clarity scores, weak-topic breakdowns, and a downloadable session report card.

## Stack

- **Backend:** FastAPI (Python 3.11), raw `psycopg` against Supabase Postgres + pgvector
- **Frontend:** React + Vite
- **LLM:** Groq (`openai/gpt-oss-120b`), free-tier, no card required
- **Embeddings:** local `sentence-transformers` (BAAI/bge-small-en-v1.5, CPU-only) — no external embedding API
- **Auth / DB / Storage:** Supabase (Auth, Postgres, Storage)
- **Deploy:** Railway (backend), Vercel (frontend)

## Structure

```
backend/           FastAPI app (Python 3.11)
  app/
    ingestion/      PDF parsing, chunking, embedding
    retrieval/       dense + lexical search, fusion, reranking
    generation/      tutor (chat), concepts, cards
    scheduling/      FSRS, exam-date planner, root-cause resolver
    routers/         API endpoints
frontend/           React + Vite
db/migrations/       Supabase SQL
docs/API.md          API contract
```

## Setup

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate  # or venv\Scripts\activate on Windows
python -m pip install -r requirements.txt
# copy .env.example -> .env and fill in Supabase + Groq keys
uvicorn app.main:app --reload

# Frontend
cd frontend
npm install
# copy .env.example -> .env and fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
npm run dev
```

See `backend/README.md` and `frontend/README.md` for details.

## Team

- <a href="https://github.com/insharahn">**Insharah**</a> — backend: ingestion, retrieval, tutor, concepts, cards
- <a href="https://github.com/esabha-coding">**Saba**</a> — backend: schema, auth, CRUD, scheduling, stats
- <a href="https://github.com/Sanyaaroraaa">**Sanya**</a> — frontend
