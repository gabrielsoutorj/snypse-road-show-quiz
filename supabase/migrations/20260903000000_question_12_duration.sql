update public.questions q
set duration_seconds = 60
from public.quizzes quiz
where q.quiz_id = quiz.id
  and quiz.slug = 'snypse-road-show-h2-2026'
  and q.position = 12;
