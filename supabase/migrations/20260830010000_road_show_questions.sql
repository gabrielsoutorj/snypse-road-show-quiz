do $$
declare
  v_quiz_id uuid;
begin
  insert into public.quizzes (slug, title, is_active)
  values ('snypse-road-show-h2-2026', 'Snypse Road Show H2 2026', true)
  on conflict (slug) do update
  set
    title = excluded.title,
    is_active = excluded.is_active
  returning id into v_quiz_id;

  insert into public.questions (
    id,
    quiz_id,
    position,
    title,
    support_text,
    insight_title,
    insight_body,
    duration_seconds,
    show_ranking_after
  ) values
    (
      '10000000-0000-4000-8000-000000000001',
      v_quiz_id,
      1,
      'Em qual ambiente a participação tende a ser mais ativa e conversacional?',
      'Onde a marca entra como parte da conversa?',
      'Resposta: Discord',
      'No Discord, a pessoa não está só assistindo: está fazendo parte. A marca entra no fluxo da conversa e participa de comunidades reais e engajadas.',
      20,
      false
    ),
    (
      '10000000-0000-4000-8000-000000000002',
      v_quiz_id,
      2,
      'Qual estado de atenção representa alguém que está ali para fazer parte?',
      'A pessoa participa, interage e constrói junto.',
      'Resposta: Participativa',
      'Na atenção participativa, a pessoa está presente para fazer parte. Discord e comunidades são exemplos desse estado de atenção.',
      20,
      true
    ),
    (
      '10000000-0000-4000-8000-000000000003',
      v_quiz_id,
      3,
      'Por que a atenção no Telegram tende a ser mais intencional?',
      'O canal também revela por que a pessoa está ali.',
      'Resposta: porque a pessoa escolheu o canal',
      'No Telegram, a marca entra no canal que a pessoa escolheu. É uma conexão direta com quem já demonstrou interesse no conteúdo.',
      20,
      false
    ),
    (
      '10000000-0000-4000-8000-000000000004',
      v_quiz_id,
      4,
      'O que transforma dados de audiência em relevância para a pessoa?',
      'Não é só saber quem ela é. É entender o que importa agora.',
      'Resposta: contexto, intenção, emoção e momento',
      'O contexto revela o que importa para a pessoa naquele momento. Tecnologia de ponta combina sinais para encontrar atenção relevante.',
      20,
      true
    ),
    (
      '10000000-0000-4000-8000-000000000005',
      v_quiz_id,
      5,
      'Segundo o Smoot Wizard, onde começa um bom plano de mídia?',
      'O briefing não começa no inventário.',
      'Resposta: na inteligência',
      'A estratégia começa no briefing e entende pessoa, emoção, contexto, momento e ambiente antes de chegar à mídia.',
      20,
      false
    ),
    (
      '10000000-0000-4000-8000-000000000006',
      v_quiz_id,
      6,
      'Qual é o papel ideal da publicidade dentro de um contexto relevante?',
      'Pertencer é mais poderoso do que interromper.',
      'Resposta: pertencer ao contexto',
      'A publicidade não precisa interromper o contexto. Ela pode fazer sentido naquele momento e pertencer naturalmente à experiência.',
      20,
      true
    ),
    (
      '10000000-0000-4000-8000-000000000007',
      v_quiz_id,
      7,
      'Para a magfiADS, o que as comunidades representam?',
      'Pessoas reais. Conversas reais. Afinidades reais.',
      'Resposta: relacionamentos',
      'Comunidades não são inventário: são relacionamentos. Tecnologia e curadoria conectam marcas às comunidades certas.',
      20,
      false
    ),
    (
      '10000000-0000-4000-8000-000000000008',
      v_quiz_id,
      8,
      'Qual combinação resume a proposta da Snypse para gerar relevância?',
      'Não é sobre estar em todo lugar.',
      'Resposta: lugar certo, momento certo e mensagem certa',
      'A Snypse combina inteligência contextual, dados relevantes, tecnologia de ponta e execução inteligente para encontrar atenção relevante.',
      20,
      false
    );

  insert into public.question_options (
    id,
    question_id,
    label,
    text,
    is_correct,
    position
  ) values
    ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'A', 'Instagram feed', false, 1),
    ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000001', 'B', 'Discord', true, 2),
    ('20000000-0000-4000-8000-000000000013', '10000000-0000-4000-8000-000000000001', 'C', 'Banner aleatório', false, 3),
    ('20000000-0000-4000-8000-000000000014', '10000000-0000-4000-8000-000000000001', 'D', 'Stories sem contexto', false, 4),

    ('20000000-0000-4000-8000-000000000021', '10000000-0000-4000-8000-000000000002', 'A', 'Passiva', false, 1),
    ('20000000-0000-4000-8000-000000000022', '10000000-0000-4000-8000-000000000002', 'B', 'Ativa', false, 2),
    ('20000000-0000-4000-8000-000000000023', '10000000-0000-4000-8000-000000000002', 'C', 'Participativa', true, 3),
    ('20000000-0000-4000-8000-000000000024', '10000000-0000-4000-8000-000000000002', 'D', 'Intencional', false, 4),

    ('20000000-0000-4000-8000-000000000031', '10000000-0000-4000-8000-000000000003', 'A', 'Porque o conteúdo aparece por acaso', false, 1),
    ('20000000-0000-4000-8000-000000000032', '10000000-0000-4000-8000-000000000003', 'B', 'Porque a pessoa escolheu seguir o canal', true, 2),
    ('20000000-0000-4000-8000-000000000033', '10000000-0000-4000-8000-000000000003', 'C', 'Porque não existe contexto no canal', false, 3),
    ('20000000-0000-4000-8000-000000000034', '10000000-0000-4000-8000-000000000003', 'D', 'Porque todo conteúdo é obrigatório', false, 4),

    ('20000000-0000-4000-8000-000000000041', '10000000-0000-4000-8000-000000000004', 'A', 'Somente idade e localização', false, 1),
    ('20000000-0000-4000-8000-000000000042', '10000000-0000-4000-8000-000000000004', 'B', 'O inventário mais barato', false, 2),
    ('20000000-0000-4000-8000-000000000043', '10000000-0000-4000-8000-000000000004', 'C', 'Contexto, intenção, emoção e momento', true, 3),
    ('20000000-0000-4000-8000-000000000044', '10000000-0000-4000-8000-000000000004', 'D', 'A maior frequência possível', false, 4),

    ('20000000-0000-4000-8000-000000000051', '10000000-0000-4000-8000-000000000005', 'A', 'No inventário disponível', false, 1),
    ('20000000-0000-4000-8000-000000000052', '10000000-0000-4000-8000-000000000005', 'B', 'Na inteligência aplicada ao briefing', true, 2),
    ('20000000-0000-4000-8000-000000000053', '10000000-0000-4000-8000-000000000005', 'C', 'No formato do anúncio', false, 3),
    ('20000000-0000-4000-8000-000000000054', '10000000-0000-4000-8000-000000000005', 'D', 'No menor CPM', false, 4),

    ('20000000-0000-4000-8000-000000000061', '10000000-0000-4000-8000-000000000006', 'A', 'Interromper para chamar atenção', false, 1),
    ('20000000-0000-4000-8000-000000000062', '10000000-0000-4000-8000-000000000006', 'B', 'Pertencer ao contexto', true, 2),
    ('20000000-0000-4000-8000-000000000063', '10000000-0000-4000-8000-000000000006', 'C', 'Aparecer em todos os canais', false, 3),
    ('20000000-0000-4000-8000-000000000064', '10000000-0000-4000-8000-000000000006', 'D', 'Repetir uma mensagem genérica', false, 4),

    ('20000000-0000-4000-8000-000000000071', '10000000-0000-4000-8000-000000000007', 'A', 'Inventário disponível', false, 1),
    ('20000000-0000-4000-8000-000000000072', '10000000-0000-4000-8000-000000000007', 'B', 'Relacionamentos', true, 2),
    ('20000000-0000-4000-8000-000000000073', '10000000-0000-4000-8000-000000000007', 'C', 'Audiência anônima', false, 3),
    ('20000000-0000-4000-8000-000000000074', '10000000-0000-4000-8000-000000000007', 'D', 'Tráfego genérico', false, 4),

    ('20000000-0000-4000-8000-000000000081', '10000000-0000-4000-8000-000000000008', 'A', 'Todo lugar, mais volume e repetição', false, 1),
    ('20000000-0000-4000-8000-000000000082', '10000000-0000-4000-8000-000000000008', 'B', 'Lugar certo, momento certo e mensagem certa', true, 2),
    ('20000000-0000-4000-8000-000000000083', '10000000-0000-4000-8000-000000000008', 'C', 'Mais dados, menor CPM e mais formatos', false, 3),
    ('20000000-0000-4000-8000-000000000084', '10000000-0000-4000-8000-000000000008', 'D', 'Formato, alcance e frequência', false, 4);
end;
$$;
