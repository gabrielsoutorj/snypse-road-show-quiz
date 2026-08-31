alter table public.questions
  add column if not exists is_multi_select boolean not null default false,
  add column if not exists correct_options public.option_label[] not null default '{}'::public.option_label[];

update public.questions q
set correct_options = source.correct_options
from (
  select qo.question_id, array_agg(qo.label order by qo.position)::public.option_label[] as correct_options
  from public.question_options qo
  where qo.is_correct
  group by qo.question_id
) source
where source.question_id = q.id
  and cardinality(q.correct_options) = 0;

alter table public.answers
  add column if not exists selected_options public.option_label[];

update public.answers a
set selected_options = array[qo.label]::public.option_label[]
from public.question_options qo
where qo.id = a.option_id
  and a.selected_options is null;

alter table public.answers
  alter column selected_options set not null;

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

  if v_now > v_session.answer_deadline_at then
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
  select s.* into v_session
  from public.sessions s
  where s.id = p_session_id
  for update;

  if not found or v_session.status <> 'active' then raise exception 'SESSION_NOT_FOUND'; end if;
  if v_session.host_user_id <> p_actor_user_id then raise exception 'HOST_ONLY'; end if;
  if v_session.phase_version <> p_expected_version then raise exception 'STALE_PHASE_VERSION'; end if;
  if v_session.phase <> 'question_open' then raise exception 'INVALID_PHASE_TRANSITION'; end if;
  if not p_force and v_now < v_session.answer_deadline_at then raise exception 'QUESTION_TIMER_STILL_RUNNING'; end if;

  select q.duration_seconds * 1000 into v_duration_ms
  from public.questions q where q.id = v_session.current_question_id;

  with evaluation as (
    select
      a.id,
      a.participant_id,
      a.response_ms,
      a.selected_options = q.correct_options as answer_is_correct
    from public.answers a
    join public.questions q on q.id = a.question_id
    where a.session_id = p_session_id
      and a.question_id = v_session.current_question_id
      and a.is_correct is null
  ), scored as (
    update public.answers a
    set
      is_correct = e.answer_is_correct,
      points_awarded = private.calculate_quiz_points(e.answer_is_correct, e.response_ms, v_duration_ms)
    from evaluation e
    where a.id = e.id
    returning a.participant_id, a.points_awarded, a.is_correct, a.response_ms
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
  set phase = 'answers_closed', phase_version = s.phase_version + 1
  where s.id = p_session_id
  returning s.* into v_session;

  insert into public.session_events (
    session_id, from_phase, to_phase, question_id, actor_user_id, phase_version
  ) values (
    v_session.id, 'question_open', 'answers_closed', v_session.current_question_id,
    p_actor_user_id, v_session.phase_version
  );

  perform private.broadcast_session_event(v_session.id, 'phase_changed', v_session.phase_version);
  return v_session;
end;
$$;

do $$
declare
  v_quiz_id uuid;
begin
  select id into v_quiz_id from public.quizzes where slug = 'snypse-road-show-h2-2026';

  insert into public.questions (
    id, quiz_id, position, title, support_text, insight_title, insight_body,
    duration_seconds, show_ranking_after, is_multi_select, correct_options, is_active
  ) values
    ('10000000-0000-4000-8000-000000000001', v_quiz_id, 1, 'O Smoot consegue interpretar contexto e emoção em quais tipos de conteúdo?', null, 'Resposta: B', 'Texto, imagem e vídeo podem ser interpretados para identificar contexto e emoção.', 25, false, false, array['B']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000002', v_quiz_id, 2, 'O que o Smoot Wizard consegue construir a partir de um briefing?', null, 'Resposta: A', 'O Wizard transforma o briefing em inteligência estratégica completa para ativação.', 25, false, false, array['A']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000003', v_quiz_id, 3, 'Qual é a principal diferença entre conhecer o perfil de uma pessoa e entender seu contexto?', null, 'Resposta: D', 'O perfil ajuda a entender quem a pessoa é; o contexto revela o que importa para ela agora.', 25, false, false, array['D']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000004', v_quiz_id, 4, 'Qual destes NÃO faz parte da inteligência utilizada pela Smoot para identificar oportunidades de mídia?', null, 'Resposta: C', 'A inteligência da Smoot considera contexto, emoção e momento, sem depender de cookie de terceiros.', 25, true, false, array['C']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000005', v_quiz_id, 5, 'Antes de uma comunidade receber publicidade pela Magfi, o que acontece?', null, 'Resposta: A', 'As comunidades passam por curadoria e verificação antes de receber publicidade.', 25, false, false, array['A']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000006', v_quiz_id, 6, 'Qual recurso reforça o Brand Safety da Magfi?', null, 'Resposta: B', 'A blocklist com mais de 2.400 palavras negativadas reforça o Brand Safety.', 25, false, false, array['B']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000007', v_quiz_id, 7, 'Por que a Magfi pode trabalhar com 100% de viewability?', null, 'Resposta: D', 'A impressão só é contabilizada depois de dois segundos de exposição válida.', 25, false, false, array['D']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000008', v_quiz_id, 8, 'Qual combinação pode compor um anúncio nativo da Magfi?', null, 'Resposta: C', 'O anúncio pode combinar imagem, vídeo ou GIF, copy e até três botões de CTA.', 25, true, false, array['C']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000009', v_quiz_id, 9, 'Qual frase explica melhor a diferença entre Smoot e Magfi?', null, 'Resposta: B', 'A Smoot entende contexto, emoção e momento; a Magfi conecta marcas a comunidades por vertical e afinidade.', 25, false, false, array['B']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000010', v_quiz_id, 10, 'Qual combinação representa melhor Telegram e Discord dentro da estratégia apresentada?', null, 'Resposta: A', 'Telegram representa escolha; Discord representa participação.', 25, false, false, array['A']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000011', v_quiz_id, 11, 'Como se divide a forma de utilização do Discord, aproximadamente?', null, 'Resposta: C', 'A utilização se divide aproximadamente em 70% desktop e 30% mobile.', 25, false, false, array['C']::public.option_label[], true),
    ('10000000-0000-4000-8000-000000000012', v_quiz_id, 12, 'Quais afirmações sobre as soluções apresentadas no Road Show estão corretas?', 'Selecione todas as respostas corretas.', 'Resposta: A + B + C + D', 'Todas as afirmações estão corretas e mostram como as soluções se complementam.', 35, false, true, array['A','B','C','D']::public.option_label[], true)
  on conflict (id) do update set
    position = excluded.position,
    title = excluded.title,
    support_text = excluded.support_text,
    insight_title = excluded.insight_title,
    insight_body = excluded.insight_body,
    duration_seconds = excluded.duration_seconds,
    show_ranking_after = excluded.show_ranking_after,
    is_multi_select = excluded.is_multi_select,
    correct_options = excluded.correct_options,
    is_active = excluded.is_active;

  update public.question_options
  set is_correct = false
  where question_id in (select id from public.questions where quiz_id = v_quiz_id);

  insert into public.question_options (id, question_id, label, text, is_correct, position) values
    ('20000000-0000-4000-8000-000000000011','10000000-0000-4000-8000-000000000001','A','Texto + imagem',false,1),
    ('20000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001','B','Texto + imagem + vídeo',true,2),
    ('20000000-0000-4000-8000-000000000013','10000000-0000-4000-8000-000000000001','C','Texto',false,3),
    ('20000000-0000-4000-8000-000000000014','10000000-0000-4000-8000-000000000001','D','Texto + vídeo',false,4),
    ('20000000-0000-4000-8000-000000000021','10000000-0000-4000-8000-000000000002','A','ICP, personas, emoções, contextos, canais e estratégia de ativação',true,1),
    ('20000000-0000-4000-8000-000000000022','10000000-0000-4000-8000-000000000002','B','Apenas uma segmentação contextual',false,2),
    ('20000000-0000-4000-8000-000000000023','10000000-0000-4000-8000-000000000002','C','Apenas uma seleção de inventário e formatos',false,3),
    ('20000000-0000-4000-8000-000000000024','10000000-0000-4000-8000-000000000002','D','Apenas ICP e personas',false,4),
    ('20000000-0000-4000-8000-000000000031','10000000-0000-4000-8000-000000000003','A','Perfil mostra intenção; contexto mostra idade',false,1),
    ('20000000-0000-4000-8000-000000000032','10000000-0000-4000-8000-000000000003','B','Na prática, não existe diferença',false,2),
    ('20000000-0000-4000-8000-000000000033','10000000-0000-4000-8000-000000000003','C','Perfil mostra dispositivo; contexto mostra localização',false,3),
    ('20000000-0000-4000-8000-000000000034','10000000-0000-4000-8000-000000000003','D','Perfil ajuda a entender quem ela é; contexto ajuda a entender o que importa para ela agora',true,4),
    ('20000000-0000-4000-8000-000000000041','10000000-0000-4000-8000-000000000004','A','Emoção',false,1),
    ('20000000-0000-4000-8000-000000000042','10000000-0000-4000-8000-000000000004','B','Contexto',false,2),
    ('20000000-0000-4000-8000-000000000043','10000000-0000-4000-8000-000000000004','C','Cookie de terceiros',true,3),
    ('20000000-0000-4000-8000-000000000044','10000000-0000-4000-8000-000000000004','D','Momento',false,4),
    ('20000000-0000-4000-8000-000000000051','10000000-0000-4000-8000-000000000005','A','Passa por um processo de curadoria e verificação',true,1),
    ('20000000-0000-4000-8000-000000000052','10000000-0000-4000-8000-000000000005','B','Precisa publicar conteúdo diariamente',false,2),
    ('20000000-0000-4000-8000-000000000053','10000000-0000-4000-8000-000000000005','C','Precisa atingir um número mínimo de 1 milhão de membros',false,3),
    ('20000000-0000-4000-8000-000000000054','10000000-0000-4000-8000-000000000005','D','Precisa necessariamente ser pública',false,4),
    ('20000000-0000-4000-8000-000000000061','10000000-0000-4000-8000-000000000006','A','Aprovação manual de cada impressão',false,1),
    ('20000000-0000-4000-8000-000000000062','10000000-0000-4000-8000-000000000006','B','Blocklist com mais de 2.400 palavras negativadas',true,2),
    ('20000000-0000-4000-8000-000000000063','10000000-0000-4000-8000-000000000006','C','Bloqueio automático de comunidades com menos de 100 mil membros',false,3),
    ('20000000-0000-4000-8000-000000000064','10000000-0000-4000-8000-000000000006','D','Exclusão apenas por categoria de conteúdo',false,4),
    ('20000000-0000-4000-8000-000000000071','10000000-0000-4000-8000-000000000007','A','Porque todas as campanhas são compradas por CPC',false,1),
    ('20000000-0000-4000-8000-000000000072','10000000-0000-4000-8000-000000000007','B','Porque entrega somente no topo da tela',false,2),
    ('20000000-0000-4000-8000-000000000073','10000000-0000-4000-8000-000000000007','C','Porque não contabiliza impressões mobile',false,3),
    ('20000000-0000-4000-8000-000000000074','10000000-0000-4000-8000-000000000007','D','Porque a impressão só é contabilizada após 2 segundos de exposição válida',true,4),
    ('20000000-0000-4000-8000-000000000081','10000000-0000-4000-8000-000000000008','A','Imagem + 1 botão de CTA',false,1),
    ('20000000-0000-4000-8000-000000000082','10000000-0000-4000-8000-000000000008','B','Vídeo + 1 botão de CTA',false,2),
    ('20000000-0000-4000-8000-000000000083','10000000-0000-4000-8000-000000000008','C','Imagem, vídeo ou GIF + copy + até 3 botões de CTA',true,3),
    ('20000000-0000-4000-8000-000000000084','10000000-0000-4000-8000-000000000008','D','Imagem + copy + 1 botão de CTA',false,4),
    ('20000000-0000-4000-8000-000000000091','10000000-0000-4000-8000-000000000009','A','Smoot atua em conteúdo editorial; Magfi atua apenas em redes sociais',false,1),
    ('20000000-0000-4000-8000-000000000092','10000000-0000-4000-8000-000000000009','B','Smoot entende contexto, emoção e momento; Magfi conecta marcas a comunidades por vertical e afinidade',true,2),
    ('20000000-0000-4000-8000-000000000093','10000000-0000-4000-8000-000000000009','C','As duas soluções fazem essencialmente a mesma coisa em ambientes diferentes',false,3),
    ('20000000-0000-4000-8000-000000000094','10000000-0000-4000-8000-000000000009','D','Smoot trabalha com audiência; Magfi trabalha com alcance',false,4),
    ('20000000-0000-4000-8000-000000000101','10000000-0000-4000-8000-000000000010','A','Telegram = escolha / Discord = participação',true,1),
    ('20000000-0000-4000-8000-000000000102','10000000-0000-4000-8000-000000000010','B','Telegram = descoberta / Discord = consideração',false,2),
    ('20000000-0000-4000-8000-000000000103','10000000-0000-4000-8000-000000000010','C','Telegram = passividade / Discord = intenção',false,3),
    ('20000000-0000-4000-8000-000000000104','10000000-0000-4000-8000-000000000010','D','Telegram = alcance / Discord = frequência',false,4),
    ('20000000-0000-4000-8000-000000000111','10000000-0000-4000-8000-000000000011','A','70% mobile / 30% desktop',false,1),
    ('20000000-0000-4000-8000-000000000112','10000000-0000-4000-8000-000000000011','B','50% mobile / 50% desktop',false,2),
    ('20000000-0000-4000-8000-000000000113','10000000-0000-4000-8000-000000000011','C','70% desktop / 30% mobile',true,3),
    ('20000000-0000-4000-8000-000000000114','10000000-0000-4000-8000-000000000011','D','100% mobile',false,4),
    ('20000000-0000-4000-8000-000000000121','10000000-0000-4000-8000-000000000012','A','A Smoot consegue interpretar contexto e emoção em texto, imagem e vídeo.',true,1),
    ('20000000-0000-4000-8000-000000000122','10000000-0000-4000-8000-000000000012','B','A Magfi trabalha com curadoria e verificação de comunidades, Brand Safety e publicidade nativa.',false,2),
    ('20000000-0000-4000-8000-000000000123','10000000-0000-4000-8000-000000000012','C','No Telegram, a marca entra em um ambiente de escolha e recorrência, enquanto no Discord entra em um ambiente de participação e conversa ativa.',false,3),
    ('20000000-0000-4000-8000-000000000124','10000000-0000-4000-8000-000000000012','D','Smoot e Magfi atuam de forma complementar: uma conecta mídia ao contexto e ao momento, enquanto a outra conecta marcas a verticais e comunidades de afinidade.',false,4)
  on conflict (question_id, label) do update set
    text = excluded.text,
    is_correct = excluded.is_correct,
    position = excluded.position;
end;
$$;
