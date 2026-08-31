begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

select is(
  private.calculate_quiz_points(false, 0, 20000),
  0,
  'incorrect answers score zero'
);

select is(
  private.calculate_quiz_points(true, 0, 20000),
  1000,
  'an immediate correct answer scores the maximum'
);

select is(
  private.calculate_quiz_points(true, 10000, 20000),
  750,
  'a correct answer halfway through scores 750'
);

select is(
  private.calculate_quiz_points(true, 20000, 20000),
  500,
  'a correct answer at the deadline scores the minimum'
);

select is(
  private.calculate_quiz_points(true, 99999, 20000),
  500,
  'response time is clamped to the deadline'
);

select * from finish();
rollback;
