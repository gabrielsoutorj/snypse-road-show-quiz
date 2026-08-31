insert into public.quizzes (slug, title, is_active)
values ('snypse-road-show-h2-2026', 'Snypse Road Show H2 2026', true)
on conflict (slug) do update
set
  title = excluded.title,
  is_active = excluded.is_active;

-- As perguntas oficiais serão adicionadas em uma migration editorial separada.
-- Não usamos conteúdo fictício para evitar divergência com o deck aprovado.
