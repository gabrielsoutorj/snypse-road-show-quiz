create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create type public.session_status as enum ('active', 'ended', 'cancelled');
create type public.session_phase as enum (
  'lobby',
  'question_open',
  'answers_closed',
  'question_result',
  'answer_reveal',
  'ranking',
  'podium',
  'ended'
);
create type public.option_label as enum ('A', 'B', 'C', 'D');

create table public.quizzes (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique,
  title text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint quizzes_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint quizzes_title_not_blank check (length(btrim(title)) > 0)
);

create unique index quizzes_one_active_idx
  on public.quizzes (is_active)
  where is_active;

create table public.questions (
  id uuid primary key default extensions.gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  position smallint not null,
  title text not null,
  support_text text,
  insight_title text,
  insight_body text,
  duration_seconds smallint not null default 20,
  show_ranking_after boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint questions_position_positive check (position > 0),
  constraint questions_title_not_blank check (length(btrim(title)) > 0),
  constraint questions_duration_range check (duration_seconds between 5 and 120),
  unique (quiz_id, position)
);

create table public.question_options (
  id uuid primary key default extensions.gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label public.option_label not null,
  text text not null,
  is_correct boolean not null default false,
  position smallint not null,
  created_at timestamptz not null default now(),
  constraint question_options_text_not_blank check (length(btrim(text)) > 0),
  constraint question_options_position_range check (position between 1 and 4),
  unique (question_id, label),
  unique (question_id, position),
  unique (id, question_id)
);

create unique index question_options_one_correct_idx
  on public.question_options (question_id)
  where is_correct;

create table public.sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete restrict,
  pin text not null,
  host_user_id uuid not null references auth.users(id) on delete restrict,
  status public.session_status not null default 'active',
  phase public.session_phase not null default 'lobby',
  phase_version bigint not null default 1,
  current_question_id uuid references public.questions(id) on delete restrict,
  question_opened_at timestamptz,
  answer_deadline_at timestamptz,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  constraint sessions_pin_six_digits check (pin ~ '^[0-9]{6}$'),
  constraint sessions_phase_version_positive check (phase_version > 0),
  constraint sessions_question_times_ordered check (
    question_opened_at is null
    or answer_deadline_at is null
    or answer_deadline_at > question_opened_at
  ),
  constraint sessions_ended_consistent check (
    (status = 'ended' and phase = 'ended' and ended_at is not null)
    or status <> 'ended'
  )
);

create unique index sessions_active_pin_idx
  on public.sessions (pin)
  where status = 'active';

create index sessions_host_idx on public.sessions (host_user_id, created_at desc);

create table public.participants (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname varchar(24) not null,
  total_points integer not null default 0,
  correct_answers smallint not null default 0,
  total_response_ms bigint not null default 0,
  joined_at timestamptz not null default now(),
  constraint participants_nickname_length check (char_length(nickname) between 2 and 24),
  constraint participants_nickname_trimmed check (nickname = btrim(nickname)),
  constraint participants_points_nonnegative check (total_points >= 0),
  constraint participants_correct_nonnegative check (correct_answers >= 0),
  constraint participants_response_time_nonnegative check (total_response_ms >= 0),
  unique (session_id, user_id)
);

create unique index participants_session_nickname_idx
  on public.participants (session_id, lower(nickname));

create index participants_ranking_idx
  on public.participants (
    session_id,
    total_points desc,
    correct_answers desc,
    total_response_ms asc,
    joined_at asc
  );

create table public.answers (
  id uuid primary key default extensions.gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  participant_id uuid not null references public.participants(id) on delete cascade,
  option_id uuid not null,
  submitted_at timestamptz not null default clock_timestamp(),
  response_ms integer not null,
  is_correct boolean,
  points_awarded integer,
  constraint answers_option_matches_question
    foreign key (option_id, question_id)
    references public.question_options(id, question_id)
    on delete restrict,
  constraint answers_response_time_nonnegative check (response_ms >= 0),
  constraint answers_points_range check (points_awarded between 0 and 1000),
  constraint answers_score_completion check (
    (is_correct is null and points_awarded is null)
    or (is_correct is not null and points_awarded is not null)
  ),
  unique (session_id, question_id, participant_id)
);

create index answers_session_question_idx
  on public.answers (session_id, question_id);

create table public.session_events (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  from_phase public.session_phase,
  to_phase public.session_phase not null,
  question_id uuid references public.questions(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  phase_version bigint not null,
  created_at timestamptz not null default clock_timestamp()
);

create index session_events_session_idx
  on public.session_events (session_id, id desc);

alter table public.quizzes enable row level security;
alter table public.questions enable row level security;
alter table public.question_options enable row level security;
alter table public.sessions enable row level security;
alter table public.participants enable row level security;
alter table public.answers enable row level security;
alter table public.session_events enable row level security;

revoke all on table public.quizzes from anon, authenticated;
revoke all on table public.questions from anon, authenticated;
revoke all on table public.question_options from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.participants from anon, authenticated;
revoke all on table public.answers from anon, authenticated;
revoke all on table public.session_events from anon, authenticated;

grant select on table public.sessions to authenticated;
grant select on table public.participants to authenticated;

create or replace function private.is_session_member(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sessions s
    where s.id = p_session_id
      and s.host_user_id = auth.uid()
  ) or exists (
    select 1
    from public.participants p
    where p.session_id = p_session_id
      and p.user_id = auth.uid()
  );
$$;

revoke all on function private.is_session_member(uuid) from public, anon, authenticated;
grant execute on function private.is_session_member(uuid) to authenticated;

create policy sessions_members_can_read
on public.sessions
for select
to authenticated
using ((select private.is_session_member(id)));

create policy participants_can_read_self
on public.participants
for select
to authenticated
using (user_id = (select auth.uid()));

create or replace function private.can_access_session_topic()
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_topic text := realtime.topic();
  v_session_id uuid;
begin
  if v_topic !~ '^session:[0-9a-fA-F-]{36}$' then
    return false;
  end if;

  v_session_id := split_part(v_topic, ':', 2)::uuid;
  return private.is_session_member(v_session_id);
exception
  when invalid_text_representation then
    return false;
end;
$$;

revoke all on function private.can_access_session_topic() from public, anon, authenticated;
grant execute on function private.can_access_session_topic() to authenticated;

create policy quiz_members_can_receive_realtime
on realtime.messages
for select
to authenticated
using (
  extension in ('broadcast', 'presence')
  and (select private.can_access_session_topic())
);

create policy quiz_members_can_track_presence
on realtime.messages
for insert
to authenticated
with check (
  extension = 'presence'
  and (select private.can_access_session_topic())
);

create or replace function private.broadcast_session_event(
  p_session_id uuid,
  p_event text,
  p_phase_version bigint
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object(
      'sessionId', p_session_id,
      'phaseVersion', p_phase_version
    ),
    p_event,
    'session:' || p_session_id::text,
    true
  );
end;
$$;

revoke all on function private.broadcast_session_event(uuid, text, bigint)
  from public, anon, authenticated;
grant execute on function private.broadcast_session_event(uuid, text, bigint)
  to service_role;

create or replace function private.calculate_quiz_points(
  p_is_correct boolean,
  p_response_ms integer,
  p_duration_ms integer
)
returns integer
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when not p_is_correct or p_duration_ms <= 0 then 0
    else round(
      500 + 500 * (
        1 - least(greatest(p_response_ms, 0), p_duration_ms)::numeric / p_duration_ms
      )
    )::integer
  end;
$$;

revoke all on function private.calculate_quiz_points(boolean, integer, integer)
  from public, anon, authenticated;
grant execute on function private.calculate_quiz_points(boolean, integer, integer)
  to service_role;

create or replace function public.create_quiz_session(p_host_user_id uuid)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_quiz_id uuid;
  v_pin text;
  v_session public.sessions;
  v_attempt smallint := 0;
begin
  select q.id
  into v_quiz_id
  from public.quizzes q
  where q.is_active
  order by q.created_at desc
  limit 1;

  if v_quiz_id is null then
    raise exception 'ACTIVE_QUIZ_NOT_FOUND';
  end if;

  loop
    v_attempt := v_attempt + 1;
    v_pin := lpad(floor(random() * 1000000)::integer::text, 6, '0');

    begin
      insert into public.sessions (quiz_id, pin, host_user_id)
      values (v_quiz_id, v_pin, p_host_user_id)
      returning * into v_session;
      exit;
    exception
      when unique_violation then
        if v_attempt >= 50 then
          raise exception 'PIN_GENERATION_FAILED';
        end if;
    end;
  end loop;

  insert into public.session_events (
    session_id,
    from_phase,
    to_phase,
    actor_user_id,
    phase_version
  ) values (
    v_session.id,
    null,
    'lobby',
    p_host_user_id,
    v_session.phase_version
  );

  return v_session;
end;
$$;

create or replace function public.join_quiz_session(
  p_pin text,
  p_user_id uuid,
  p_nickname text
)
returns public.participants
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_participant public.participants;
  v_nickname text := btrim(p_nickname);
begin
  if v_nickname is null or char_length(v_nickname) not between 2 and 24 then
    raise exception 'INVALID_NICKNAME';
  end if;

  select s.*
  into v_session
  from public.sessions s
  where s.pin = p_pin
    and s.status = 'active'
  for update;

  if not found then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.phase <> 'lobby' then
    raise exception 'SESSION_ALREADY_STARTED';
  end if;

  select p.*
  into v_participant
  from public.participants p
  where p.session_id = v_session.id
    and p.user_id = p_user_id;

  if found then
    return v_participant;
  end if;

  insert into public.participants (session_id, user_id, nickname)
  values (v_session.id, p_user_id, v_nickname)
  returning * into v_participant;

  perform private.broadcast_session_event(
    v_session.id,
    'participant_joined',
    v_session.phase_version
  );

  return v_participant;
exception
  when unique_violation then
    select p.*
    into v_participant
    from public.participants p
    where p.session_id = v_session.id
      and p.user_id = p_user_id;

    if found then
      return v_participant;
    end if;

    raise exception 'NICKNAME_ALREADY_IN_USE';
end;
$$;

create or replace function public.submit_quiz_answer(
  p_session_id uuid,
  p_user_id uuid,
  p_option public.option_label
)
returns table (answer_id uuid, submitted_at timestamptz, response_ms integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_participant_id uuid;
  v_option_id uuid;
  v_existing public.answers;
  v_now timestamptz := clock_timestamp();
  v_response_ms integer;
begin
  select s.*
  into v_session
  from public.sessions s
  where s.id = p_session_id
  for update;

  if not found or v_session.status <> 'active' then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.phase <> 'question_open' then
    raise exception 'QUESTION_NOT_OPEN';
  end if;

  if v_now > v_session.answer_deadline_at then
    raise exception 'ANSWER_DEADLINE_EXPIRED';
  end if;

  select p.id
  into v_participant_id
  from public.participants p
  where p.session_id = p_session_id
    and p.user_id = p_user_id;

  if v_participant_id is null then
    raise exception 'PARTICIPANT_NOT_FOUND';
  end if;

  select a.*
  into v_existing
  from public.answers a
  where a.session_id = p_session_id
    and a.question_id = v_session.current_question_id
    and a.participant_id = v_participant_id;

  if found then
    return query
    select v_existing.id, v_existing.submitted_at, v_existing.response_ms;
    return;
  end if;

  select qo.id
  into v_option_id
  from public.question_options qo
  where qo.question_id = v_session.current_question_id
    and qo.label = p_option;

  if v_option_id is null then
    raise exception 'OPTION_NOT_FOUND';
  end if;

  v_response_ms := greatest(
    0,
    floor(extract(epoch from (v_now - v_session.question_opened_at)) * 1000)::integer
  );

  insert into public.answers (
    session_id,
    question_id,
    participant_id,
    option_id,
    submitted_at,
    response_ms
  ) values (
    p_session_id,
    v_session.current_question_id,
    v_participant_id,
    v_option_id,
    v_now,
    v_response_ms
  )
  returning id, public.answers.submitted_at, public.answers.response_ms
  into answer_id, submitted_at, response_ms;

  perform private.broadcast_session_event(
    v_session.id,
    'answer_count_changed',
    v_session.phase_version
  );

  return next;
end;
$$;

create or replace function public.close_quiz_question(
  p_session_id uuid,
  p_actor_user_id uuid,
  p_expected_version bigint,
  p_force boolean default false
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_duration_ms integer;
  v_now timestamptz := clock_timestamp();
begin
  select s.*
  into v_session
  from public.sessions s
  where s.id = p_session_id
  for update;

  if not found or v_session.status <> 'active' then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.host_user_id <> p_actor_user_id then
    raise exception 'HOST_ONLY';
  end if;

  if v_session.phase_version <> p_expected_version then
    raise exception 'STALE_PHASE_VERSION';
  end if;

  if v_session.phase <> 'question_open' then
    raise exception 'INVALID_PHASE_TRANSITION';
  end if;

  if not p_force and v_now < v_session.answer_deadline_at then
    raise exception 'QUESTION_TIMER_STILL_RUNNING';
  end if;

  select q.duration_seconds * 1000
  into v_duration_ms
  from public.questions q
  where q.id = v_session.current_question_id;

  with scored as (
    update public.answers a
    set
      is_correct = qo.is_correct,
      points_awarded = private.calculate_quiz_points(
        qo.is_correct,
        a.response_ms,
        v_duration_ms
      )
    from public.question_options qo
    where a.session_id = p_session_id
      and a.question_id = v_session.current_question_id
      and a.is_correct is null
      and qo.id = a.option_id
    returning
      a.participant_id,
      a.points_awarded,
      a.is_correct,
      a.response_ms
  ), totals as (
    select
      participant_id,
      sum(points_awarded)::integer as points,
      count(*) filter (where is_correct)::smallint as correct,
      coalesce(sum(response_ms) filter (where is_correct), 0)::bigint as correct_ms
    from scored
    group by participant_id
  )
  update public.participants p
  set
    total_points = p.total_points + t.points,
    correct_answers = p.correct_answers + t.correct,
    total_response_ms = p.total_response_ms + t.correct_ms
  from totals t
  where p.id = t.participant_id;

  update public.sessions s
  set
    phase = 'answers_closed',
    phase_version = s.phase_version + 1
  where s.id = p_session_id
  returning s.* into v_session;

  insert into public.session_events (
    session_id,
    from_phase,
    to_phase,
    question_id,
    actor_user_id,
    phase_version
  ) values (
    v_session.id,
    'question_open',
    'answers_closed',
    v_session.current_question_id,
    p_actor_user_id,
    v_session.phase_version
  );

  perform private.broadcast_session_event(
    v_session.id,
    'phase_changed',
    v_session.phase_version
  );

  return v_session;
end;
$$;

create or replace function public.transition_quiz_session(
  p_session_id uuid,
  p_actor_user_id uuid,
  p_expected_version bigint,
  p_command text
)
returns public.sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.sessions;
  v_from_phase public.session_phase;
  v_to_phase public.session_phase;
  v_current_position smallint;
  v_next_question public.questions;
  v_has_next boolean;
  v_option_count integer;
  v_correct_count integer;
  v_now timestamptz := clock_timestamp();
begin
  select s.*
  into v_session
  from public.sessions s
  where s.id = p_session_id
  for update;

  if not found or v_session.status <> 'active' then
    raise exception 'SESSION_NOT_FOUND';
  end if;

  if v_session.host_user_id <> p_actor_user_id then
    raise exception 'HOST_ONLY';
  end if;

  if v_session.phase_version <> p_expected_version then
    raise exception 'STALE_PHASE_VERSION';
  end if;

  v_from_phase := v_session.phase;

  if p_command = 'start_question' then
    if v_session.phase not in ('lobby', 'answer_reveal', 'ranking') then
      raise exception 'INVALID_PHASE_TRANSITION';
    end if;

    if v_session.current_question_id is null then
      v_current_position := 0;
    else
      select q.position
      into v_current_position
      from public.questions q
      where q.id = v_session.current_question_id;
    end if;

    select q.*
    into v_next_question
    from public.questions q
    where q.quiz_id = v_session.quiz_id
      and q.is_active
      and q.position > v_current_position
    order by q.position
    limit 1;

    if not found then
      raise exception 'NO_NEXT_QUESTION';
    end if;

    select
      count(*)::integer,
      count(*) filter (where qo.is_correct)::integer
    into v_option_count, v_correct_count
    from public.question_options qo
    where qo.question_id = v_next_question.id;

    if v_option_count <> 4 or v_correct_count <> 1 then
      raise exception 'QUESTION_NOT_READY';
    end if;

    v_to_phase := 'question_open';
    update public.sessions s
    set
      phase = v_to_phase,
      phase_version = s.phase_version + 1,
      current_question_id = v_next_question.id,
      question_opened_at = v_now,
      answer_deadline_at = v_now + make_interval(secs => v_next_question.duration_seconds)
    where s.id = p_session_id
    returning s.* into v_session;

  elsif p_command = 'show_result' then
    if v_session.phase <> 'answers_closed' then
      raise exception 'INVALID_PHASE_TRANSITION';
    end if;
    v_to_phase := 'question_result';

    update public.sessions s
    set phase = v_to_phase, phase_version = s.phase_version + 1
    where s.id = p_session_id
    returning s.* into v_session;

  elsif p_command = 'reveal_answer' then
    if v_session.phase <> 'question_result' then
      raise exception 'INVALID_PHASE_TRANSITION';
    end if;
    v_to_phase := 'answer_reveal';

    update public.sessions s
    set phase = v_to_phase, phase_version = s.phase_version + 1
    where s.id = p_session_id
    returning s.* into v_session;

  elsif p_command = 'show_ranking' then
    if v_session.phase <> 'answer_reveal' then
      raise exception 'INVALID_PHASE_TRANSITION';
    end if;
    v_to_phase := 'ranking';

    update public.sessions s
    set phase = v_to_phase, phase_version = s.phase_version + 1
    where s.id = p_session_id
    returning s.* into v_session;

  elsif p_command = 'show_podium' then
    if v_session.phase not in ('answer_reveal', 'ranking') then
      raise exception 'INVALID_PHASE_TRANSITION';
    end if;

    select exists (
      select 1
      from public.questions current_q
      join public.questions next_q
        on next_q.quiz_id = current_q.quiz_id
       and next_q.is_active
       and next_q.position > current_q.position
      where current_q.id = v_session.current_question_id
    ) into v_has_next;

    if v_has_next then
      raise exception 'QUIZ_HAS_REMAINING_QUESTIONS';
    end if;

    v_to_phase := 'podium';
    update public.sessions s
    set phase = v_to_phase, phase_version = s.phase_version + 1
    where s.id = p_session_id
    returning s.* into v_session;

  elsif p_command = 'end_session' then
    if v_session.phase <> 'podium' then
      raise exception 'INVALID_PHASE_TRANSITION';
    end if;
    v_to_phase := 'ended';

    update public.sessions s
    set
      phase = v_to_phase,
      status = 'ended',
      ended_at = v_now,
      phase_version = s.phase_version + 1
    where s.id = p_session_id
    returning s.* into v_session;

  else
    raise exception 'UNKNOWN_HOST_COMMAND';
  end if;

  insert into public.session_events (
    session_id,
    from_phase,
    to_phase,
    question_id,
    actor_user_id,
    phase_version
  ) values (
    v_session.id,
    v_from_phase,
    v_to_phase,
    v_session.current_question_id,
    p_actor_user_id,
    v_session.phase_version
  );

  perform private.broadcast_session_event(
    v_session.id,
    'phase_changed',
    v_session.phase_version
  );

  return v_session;
end;
$$;

revoke execute on function public.create_quiz_session(uuid) from public, anon, authenticated;
revoke execute on function public.join_quiz_session(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.submit_quiz_answer(uuid, uuid, public.option_label) from public, anon, authenticated;
revoke execute on function public.close_quiz_question(uuid, uuid, bigint, boolean) from public, anon, authenticated;
revoke execute on function public.transition_quiz_session(uuid, uuid, bigint, text) from public, anon, authenticated;

grant execute on function public.create_quiz_session(uuid) to service_role;
grant execute on function public.join_quiz_session(text, uuid, text) to service_role;
grant execute on function public.submit_quiz_answer(uuid, uuid, public.option_label) to service_role;
grant execute on function public.close_quiz_question(uuid, uuid, bigint, boolean) to service_role;
grant execute on function public.transition_quiz_session(uuid, uuid, bigint, text) to service_role;

insert into public.quizzes (slug, title, is_active)
values ('snypse-road-show-h2-2026', 'Snypse Road Show H2 2026', true)
on conflict (slug) do update
set
  title = excluded.title,
  is_active = excluded.is_active;
