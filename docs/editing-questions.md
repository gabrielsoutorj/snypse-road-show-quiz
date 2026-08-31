# Como editar as perguntas sem publicar o site novamente

As perguntas ficam no Supabase. Alterações feitas no banco aparecem nas próximas salas criadas, sem precisar atualizar o GitHub Pages.

## Antes de editar

- Faça as alterações antes de criar a sala do evento.
- Não edite perguntas durante uma sessão em andamento.
- Não altere as colunas `id`, `quiz_id`, `label`, `position` ou `is_correct`.

## Editar o enunciado, tempo e resposta correta

1. Entre no projeto `snypse-road-show-quiz` no Supabase.
2. Abra **Table Editor**.
3. Abra a tabela **questions**.
4. Localize a pergunta pela coluna **position**.
5. Edite:
   - `title`: enunciado da pergunta;
   - `support_text`: instrução complementar;
   - `duration_seconds`: tempo em segundos;
   - `show_ranking_after`: mostrar ranking após essa pergunta;
   - `is_multi_select`: use `true` quando mais de uma alternativa puder ser marcada;
   - `correct_options`: resposta correta.
6. Salve a linha.

Formato de `correct_options`:

- Uma resposta correta: `{B}`
- Duas respostas corretas: `{A,C}`
- Todas corretas: `{A,B,C,D}`

## Editar o texto das alternativas

1. No **Table Editor**, abra a tabela **question_options**.
2. Use o `question_id` para localizar as quatro alternativas da pergunta.
3. Altere somente a coluna `text`.
4. Salve cada linha alterada.

As letras ficam identificadas na coluna `label`: A, B, C e D.

## Conferência obrigatória

Depois de editar:

1. Crie uma sala de teste no painel do apresentador.
2. Entre com um celular.
3. Passe pela pergunta alterada.
4. Confira enunciado, alternativas, timer e reveal da resposta.

Não reutilize uma sala criada antes da edição. Crie uma sala nova para o teste e para o evento.
