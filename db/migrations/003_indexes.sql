-- 003_indexes.sql

-- HNSW index for cosine similarity search on embeddings
create index chunks_embedding_hnsw_idx on chunks
  using hnsw (embedding vector_cosine_ops);

-- GIN index for full-text search
create index chunks_tsv_gin_idx on chunks using gin (tsv);

-- lookup indexes
create index chunks_course_id_idx on chunks (course_id);
create index chunks_document_id_idx on chunks (document_id);
create index card_states_user_due_idx on card_states (user_id, due_at);
create index gap_events_course_concept_idx on gap_events (course_id, concept_id);
create index user_concept_state_user_mastery_idx on user_concept_state (user_id, mastery);