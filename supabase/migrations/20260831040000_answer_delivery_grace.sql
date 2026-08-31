-- A tap made at the end of the countdown can spend a few hundred milliseconds
-- travelling through a mobile network. Keep the question open to delivery for
-- two extra seconds; the host UI closes it only after this safety window.
create or replace function public.submit_quiz_answer_v2(
  p_session_id uuid,
  p_user_id uuid,
  p_options public.option_label[]
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
  v_question public.questions;
  v_options public.option_label[];
  v_now timestamptz := clock_timestamp();
  v_response_ms integer;
  v_valid_option_count integer;
begin
  select array_agg(distinct selected order by selected)
  into v_options
  from unnest(p_options) selected;

  if v_options is null or cardinality(v_options) not between 1 and 4 then
    raise exception 'INVALID_OPTION';
  end if;

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

  if v_now > v_session.answer_deadline_at + interval '2 seconds' then
    raise exception 'ANSWER_DEADLINE_EXPIRED';
  end if;

  select q.* into v_question
  from public.questions q
  where q.id = v_session.current_question_id;

  if not v_question.is_multi_select and cardinality(v_options) <> 1 then
    raise exception 'QUESTION_REQUIRES_SINGLE_OPTION';
  end if;

  select count(*)::integer, min(qo.id::text)::uuid
  into v_valid_option_count, v_option_id
  from public.question_options qo
  where qo.question_id = v_session.current_question_id
    and qo.label = any(v_options);

  if v_valid_option_count <> cardinality(v_options) or v_option_id is null then
    raise exception 'OPTION_NOT_FOUND';
  end if;

  select p.id into v_participant_id
  from public.participants p
  where p.session_id = p_session_id and p.user_id = p_user_id;

  if v_participant_id is null then
    raise exception 'PARTICIPANT_NOT_FOUND';
  end if;

  select a.* into v_existing
  from public.answers a
  where a.session_id = p_session_id
    and a.question_id = v_session.current_question_id
    and a.participant_id = v_participant_id;

  if found then
    return query select v_existing.id, v_existing.submitted_at, v_existing.response_ms;
    return;
  end if;

  v_response_ms := greatest(
    0,
    floor(extract(epoch from (v_now - v_session.question_opened_at)) * 1000)::integer
  );

  insert into public.answers (
    session_id, question_id, participant_id, option_id, selected_options, submitted_at, response_ms
  ) values (
    p_session_id, v_session.current_question_id, v_participant_id, v_option_id, v_options, v_now, v_response_ms
  )
  returning id, public.answers.submitted_at, public.answers.response_ms
  into answer_id, submitted_at, response_ms;

  perform private.broadcast_session_event(v_session.id, 'answer_count_changed', v_session.phase_version);
  return next;
end;
$$;

revoke execute on function public.submit_quiz_answer_v2(uuid, uuid, public.option_label[])
from public, anon, authenticated;
grant execute on function public.submit_quiz_answer_v2(uuid, uuid, public.option_label[])
to service_role;
