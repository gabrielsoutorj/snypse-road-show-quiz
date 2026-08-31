update public.questions q
set duration_seconds = 20
from public.quizzes quiz
where q.quiz_id = quiz.id
  and quiz.slug = 'snypse-road-show-h2-2026';
