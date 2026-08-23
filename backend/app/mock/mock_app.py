"""
Standalone mock API for StudyLoop.
Returns fake data matching the exact shapes in docs/API.md,
so the frontend can be built against real response shapes
before real backend logic exists.

Run with:
    uvicorn app.mock.mock_app:app --reload
"""

from fastapi import FastAPI, UploadFile, Form
from datetime import datetime, timedelta
import uuid
import random

app = FastAPI(title="StudyLoop Mock API")

# ---- simple in-memory "database" so create/list/delete feel real ----
courses_db = {}
documents_db = {}
chat_sessions_db = {}


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


# ---------------- health ----------------

@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0-mock"}


# ---------------- courses ----------------

@app.post("/courses")
def create_course(payload: dict):
    course_id = str(uuid.uuid4())
    course = {
        "id": course_id,
        "name": payload.get("name", "Untitled Course"),
        "code": payload.get("code"),
        "exam_date": payload.get("exam_date"),
        "doc_count": 0,
        "mastery_pct": 0,
    }
    courses_db[course_id] = course
    return course


@app.get("/courses")
def list_courses():
    courses = []
    for c in courses_db.values():
        courses.append({
            "id": c["id"],
            "name": c["name"],
            "code": c["code"],
            "exam_date": c["exam_date"],
            "days_to_exam": 14,
            "doc_count": c["doc_count"],
            "card_count": random.randint(0, 40),
            "mastery_pct": round(random.uniform(0, 100), 1),
            "due_today": random.randint(0, 15),
        })
    return {"courses": courses}


@app.delete("/courses/{course_id}")
def delete_course(course_id: str):
    courses_db.pop(course_id, None)
    return {"deleted": True}


# ---------------- documents ----------------

@app.post("/documents/upload")
def upload_document(file: UploadFile, course_id: str = Form(...)):
    doc_id = str(uuid.uuid4())
    documents_db[doc_id] = {
        "doc_id": doc_id,
        "filename": file.filename,
        "course_id": course_id,
        "status": "processing",
        "progress": 0,
        "page_count": random.randint(5, 40),
        "chunk_count": random.randint(20, 200),
        "created_at": now_iso(),
    }
    return {"doc_id": doc_id, "filename": file.filename, "status": "processing"}


@app.get("/documents/{doc_id}/status")
def document_status(doc_id: str):
    doc = documents_db.get(doc_id, {
        "doc_id": doc_id, "page_count": 10, "chunk_count": 50,
    })
    return {
        "doc_id": doc_id,
        "status": "ready",
        "progress": 100,
        "page_count": doc.get("page_count", 10),
        "chunk_count": doc.get("chunk_count", 50),
        "error": None,
    }


@app.get("/courses/{course_id}/documents")
def list_course_documents(course_id: str):
    docs = [d for d in documents_db.values() if d["course_id"] == course_id]
    if not docs:
        docs = [{
            "doc_id": str(uuid.uuid4()),
            "filename": "sample-notes.pdf",
            "page_count": 12,
            "chunk_count": 64,
            "status": "ready",
            "created_at": now_iso(),
        }]
    return {"documents": [
        {
            "doc_id": d["doc_id"],
            "filename": d["filename"],
            "page_count": d.get("page_count", 12),
            "chunk_count": d.get("chunk_count", 64),
            "status": d.get("status", "ready"),
            "created_at": d.get("created_at", now_iso()),
        } for d in docs
    ]}


@app.delete("/documents/{doc_id}")
def delete_document(doc_id: str):
    documents_db.pop(doc_id, None)
    return {"deleted": True}


# ---------------- chat ----------------

@app.post("/chat")
def chat(payload: dict):
    session_id = payload.get("session_id") or str(uuid.uuid4())
    return {
        "session_id": session_id,
        "message_id": str(uuid.uuid4()),
        "answer": "Based on your notes, this concept refers to the process described on page 4.",
        "grounded": True,
        "confidence": 0.87,
        "citations": [
            {"doc_id": str(uuid.uuid4()), "filename": "sample-notes.pdf", "page": 4, "snippet": "...relevant excerpt..."}
        ],
        "concepts_touched": [
            {"id": str(uuid.uuid4()), "name": "Sample Concept"}
        ],
    }


@app.get("/chat/sessions")
def list_chat_sessions(course_id: str = None):
    return {"sessions": [
        {"id": str(uuid.uuid4()), "title": "Chat about Chapter 3", "created_at": now_iso(), "message_count": 5}
    ]}


@app.get("/chat/sessions/{session_id}")
def get_chat_session(session_id: str):
    return {"session_id": session_id, "messages": [
        {
            "id": str(uuid.uuid4()), "role": "user", "content": "What is X?",
            "grounded": None, "confidence": None, "citations": [], "created_at": now_iso(),
        },
        {
            "id": str(uuid.uuid4()), "role": "assistant", "content": "X is defined as...",
            "grounded": True, "confidence": 0.9,
            "citations": [{"doc_id": str(uuid.uuid4()), "filename": "notes.pdf", "page": 2, "snippet": "..."}],
            "created_at": now_iso(),
        },
    ]}


# ---------------- concepts ----------------

@app.post("/courses/{course_id}/build-concepts")
def build_concepts(course_id: str):
    return {"concepts_created": 12, "edges_created": 9}


@app.get("/courses/{course_id}/concepts")
def list_concepts(course_id: str):
    statuses = ["unseen", "shaky", "learning", "solid"]
    return {"concepts": [
        {
            "id": str(uuid.uuid4()),
            "name": f"Concept {i+1}",
            "description": "A sample concept description.",
            "mastery": round(random.uniform(0, 1), 2),
            "status": random.choice(statuses),
            "prerequisites": [],
            "card_count": random.randint(1, 8),
        } for i in range(6)
    ]}


@app.post("/courses/{course_id}/generate-cards")
def generate_cards(course_id: str, payload: dict = None):
    return {"created": 15}


# ---------------- review ----------------

@app.get("/review/due")
def review_due(course_id: str, limit: int = 20):
    cards = []
    for i in range(min(limit, 5)):
        cards.append({
            "card_id": str(uuid.uuid4()),
            "type": "mcq" if i % 2 == 0 else "cloze",
            "question": f"Sample question {i+1}?",
            "options": ["Option A", "Option B", "Option C", "Option D"] if i % 2 == 0 else None,
            "concept": {"id": str(uuid.uuid4()), "name": f"Concept {i+1}"},
            "source": {"doc_id": str(uuid.uuid4()), "filename": "notes.pdf", "page": i + 1},
        })
    return {
        "session_id": str(uuid.uuid4()),
        "plan": {
            "days_to_exam": 14,
            "cards_today": len(cards),
            "cards_remaining_total": 42,
            "on_track": True,
        },
        "cards": cards,
    }


@app.post("/review/submit")
def review_submit(payload: dict):
    correct = random.choice([True, False])
    return {
        "correct": correct,
        "answer": "The correct answer is Option B.",
        "explanation": "This is because of the concept explained on page 3.",
        "next_due": (datetime.utcnow() + timedelta(days=2)).isoformat() + "Z",
        "new_mastery": round(random.uniform(0, 1), 2),
        "root_cause": None if correct else {
            "concept_id": str(uuid.uuid4()),
            "name": "Prerequisite Concept",
            "mastery": 0.3,
            "reason": "You seem to be struggling with an earlier prerequisite concept.",
        },
    }


# ---------------- stats ----------------

@app.get("/courses/{course_id}/stats")
def course_stats(course_id: str):
    return {
        "streak_days": 4,
        "reviews_today": 12,
        "reviews_total": 340,
        "mastery_pct": 62.5,
        "weak_concepts": [
            {"id": str(uuid.uuid4()), "name": "Weak Concept A", "mastery": 0.2, "times_wrong": 5},
        ],
        "mastery_trend": [
            {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"), "mastery_pct": round(random.uniform(40, 70), 1)}
            for i in range(7, 0, -1)
        ],
    }


@app.get("/courses/{course_id}/pulse")
def class_pulse(course_id: str):
    return {
        "enabled": True,
        "cohort_size": 28,
        "concepts": [
            {"id": str(uuid.uuid4()), "name": "Concept A", "pct_of_class_struggling": 0.35, "you_struggling": False},
        ],
        "your_rank_pct": 72.0,
    }