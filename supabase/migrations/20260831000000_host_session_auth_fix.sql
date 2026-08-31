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
  -- The Edge Function already validates the JWT with auth.getUser().
  -- The foreign key on sessions.host_user_id remains the database guarantee.
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

revoke execute on function public.create_quiz_session(uuid) from public, anon, authenticated;
grant execute on function public.create_quiz_session(uuid) to service_role;
