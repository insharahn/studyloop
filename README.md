# StudyLoop

AI study companion that generates flashcards from your mistakes, not your notes.
Built for DoraHacks 2.0.

## Structure
- `backend/` — FastAPI (Python 3.11)
- `frontend/` — Next.js 15
- `db/migrations/` — Supabase SQL
- `docs/API.md` — frozen API contract

## Team
- Insharah — backend (ingestion, retrieval, tutor, concepts, cards)
- Saba — backend (schema, auth, CRUD, scheduling, stats)
- Sanya — frontend

## Rules
- Branch naming: `be1/*`, `be2/*`, `fe/*`
- Nothing merges to `main` outside the 9pm integration window (days 1–4)
- Never commit `.env`

## Setup
See `backend/README.md` and `frontend/README.md` (coming).