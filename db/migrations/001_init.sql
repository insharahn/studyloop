-- 001_init.sql
-- Extensions
create extension if not exists "vector";
create extension if not exists "pg_trgm";

-- profiles (mirrors auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

-- courses
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  code text,
  exam_date date,
  created_at timestamptz not null default now()
);

-- documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  filename text not null,
  storage_path text not null,
  file_hash text not null,
  page_count int default 0,
  chunk_count int default 0,
  status text not null default 'processing' check (status in ('processing','ready','failed')),
  progress int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  unique (course_id, file_hash)
);

-- chunks
create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  page_number int not null,
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(384),
  tsv tsvector generated always as (to_tsvector('english', content)) stored
);

-- concepts
create table concepts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  name text not null,
  description text,
  source_document_id uuid references documents(id) on delete set null,
  source_page int,
  created_at timestamptz not null default now(),
  unique (course_id, name)
);

-- concept_edges (prerequisite -> concept, forms a DAG)
create table concept_edges (
  id uuid primary key default gen_random_uuid(),
  prerequisite_id uuid not null references concepts(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  unique (prerequisite_id, concept_id)
);

-- user_concept_state
create table user_concept_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  mastery float not null default 0,
  status text not null default 'unseen' check (status in ('unseen','shaky','learning','solid')),
  times_asked int not null default 0,
  times_wrong int not null default 0,
  unique (user_id, concept_id)
);

-- chat_sessions
create table chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

-- chat_messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  grounded boolean,
  confidence float,
  citations jsonb,
  concepts_touched jsonb,
  created_at timestamptz not null default now()
);

-- cards
create table cards (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  type text not null check (type in ('mcq','cloze')),
  question text not null,
  options jsonb,
  answer text not null,
  explanation text,
  source_document_id uuid references documents(id) on delete set null,
  source_page int,
  created_at timestamptz not null default now()
);

-- card_states (per-user scheduling state)
create table card_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  stability float,
  difficulty float,
  due_at timestamptz not null default now(),
  reps int not null default 0,
  lapses int not null default 0,
  state text not null default 'new',
  last_review timestamptz,
  unique (user_id, card_id)
);

-- reviews (answer log)
create table reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  grade int not null check (grade between 1 and 4),
  elapsed_ms int,
  reviewed_at timestamptz not null default now()
);

-- gap_events (evidence of confusion)
create table gap_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  concept_id uuid not null references concepts(id) on delete cascade,
  source text not null check (source in ('doubt','review_fail')),
  card_id uuid references cards(id) on delete set null,
  created_at timestamptz not null default now()
);