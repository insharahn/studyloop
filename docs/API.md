GET    /health
       → { status: "ok", version: str }

POST   /courses
       { name: str, code?: str, exam_date?: "YYYY-MM-DD" }
       → { id, name, code, exam_date, doc_count: 0, mastery_pct: 0 }

GET    /courses
       → { courses: [ { id, name, code, exam_date, days_to_exam: int|null,
                        doc_count: int, card_count: int, mastery_pct: float,
                        due_today: int } ] }

DELETE /courses/{course_id}
       → { deleted: true }

POST   /documents/upload            (multipart: file, course_id)
       → { doc_id, filename, status: "processing" }

GET    /documents/{doc_id}/status
       → { doc_id, status: "processing"|"ready"|"failed",
           progress: int, page_count: int, chunk_count: int, error: str|null }

GET    /courses/{course_id}/documents
       → { documents: [ { doc_id, filename, page_count, chunk_count,
                          status, created_at } ] }

DELETE /documents/{doc_id}
       → { deleted: true }

POST   /chat
       { course_id, message: str, session_id?: str }
       → { session_id, message_id,
           answer: str,
           grounded: bool,
           confidence: float,
           citations: [ { doc_id, filename, page, snippet } ],
           concepts_touched: [ { id, name } ] }

GET    /chat/sessions?course_id=
       → { sessions: [ { id, title, created_at, message_count } ] }

GET    /chat/sessions/{session_id}
       → { session_id, messages: [ { id, role, content, grounded, confidence,
                                     citations, created_at } ] }

POST   /courses/{course_id}/build-concepts
       → { concepts_created: int, edges_created: int }

GET    /courses/{course_id}/concepts
       → { concepts: [ { id, name, description, mastery: float,
                         status: "unseen"|"shaky"|"learning"|"solid",
                         prerequisites: [ concept_id ], card_count: int } ] }

POST   /courses/{course_id}/generate-cards
       { concept_ids?: [uuid], per_concept?: int }
       → { created: int }

GET    /review/due?course_id=&limit=20
       → { session_id,
           plan: { days_to_exam: int|null, cards_today: int,
                   cards_remaining_total: int, on_track: bool },
           cards: [ { card_id, type: "mcq"|"cloze", question,
                      options: [str]|null,
                      concept: { id, name },
                      source: { doc_id, filename, page } } ] }

POST   /review/submit
       { card_id, grade: 1|2|3|4, elapsed_ms: int }
       → { correct: bool,
           answer: str,
           explanation: str,
           next_due: "ISO8601",
           new_mastery: float,
           root_cause: { concept_id, name, mastery, reason: str } | null }

GET    /courses/{course_id}/stats
       → { streak_days: int, reviews_today: int, reviews_total: int,
           mastery_pct: float,
           weak_concepts: [ { id, name, mastery, times_wrong } ],
           mastery_trend: [ { date, mastery_pct } ] }

GET    /courses/{course_id}/pulse
       → { enabled: bool, cohort_size: int,
           concepts: [ { id, name, pct_of_class_struggling: float,
                         you_struggling: bool } ],
           your_rank_pct: float|null }