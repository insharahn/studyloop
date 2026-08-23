-- 002_rls.sql

alter table profiles enable row level security;
alter table courses enable row level security;
alter table documents enable row level security;
alter table chunks enable row level security;
alter table concepts enable row level security;
alter table concept_edges enable row level security;
alter table user_concept_state enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table cards enable row level security;
alter table card_states enable row level security;
alter table reviews enable row level security;
alter table gap_events enable row level security;

-- profiles: user sees only their own row
create policy "profiles_select_own" on profiles
  for select using (id = auth.uid());
create policy "profiles_update_own" on profiles
  for update using (id = auth.uid());

-- courses: user-scoped directly
create policy "courses_all_own" on courses
  for all using (user_id = auth.uid());

-- documents: scoped via owning course
create policy "documents_all_via_course" on documents
  for all using (
    exists (select 1 from courses c where c.id = documents.course_id and c.user_id = auth.uid())
  );

-- chunks: scoped via owning course
create policy "chunks_all_via_course" on chunks
  for all using (
    exists (select 1 from courses c where c.id = chunks.course_id and c.user_id = auth.uid())
  );

-- concepts: scoped via owning course
create policy "concepts_all_via_course" on concepts
  for all using (
    exists (select 1 from courses c where c.id = concepts.course_id and c.user_id = auth.uid())
  );

-- concept_edges: scoped via the concept's course
create policy "concept_edges_all_via_course" on concept_edges
  for all using (
    exists (
      select 1 from concepts c
      join courses co on co.id = c.course_id
      where c.id = concept_edges.concept_id and co.user_id = auth.uid()
    )
  );

-- user_concept_state: user-scoped directly
create policy "ucs_all_own" on user_concept_state
  for all using (user_id = auth.uid());

-- chat_sessions: user-scoped directly
create policy "chat_sessions_all_own" on chat_sessions
  for all using (user_id = auth.uid());

-- chat_messages: scoped via owning session
create policy "chat_messages_all_via_session" on chat_messages
  for all using (
    exists (select 1 from chat_sessions s where s.id = chat_messages.session_id and s.user_id = auth.uid())
  );

-- cards: scoped via owning course
create policy "cards_all_via_course" on cards
  for all using (
    exists (select 1 from courses c where c.id = cards.course_id and c.user_id = auth.uid())
  );

-- card_states: user-scoped directly
create policy "card_states_all_own" on card_states
  for all using (user_id = auth.uid());

-- reviews: user-scoped directly
create policy "reviews_all_own" on reviews
  for all using (user_id = auth.uid());

-- gap_events: user-scoped directly
create policy "gap_events_all_own" on gap_events
  for all using (user_id = auth.uid());