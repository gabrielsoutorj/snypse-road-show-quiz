# Arquitetura dos Builds 1–5

## Interfaces e rotas

| Interface | Rotas |
| --- | --- |
| Participante | `/`, `/join/:pin`, `/play/:sessionId` |
| Apresentador | `/host`, `/host/:sessionId` |
| Telão | `/screen/:sessionId` |

As três interfaces usam a mesma aplicação React. A rota escolhe a experiência e o snapshot do servidor escolhe o conteúdo permitido para aquela identidade.

## Builds 2, 3, 4 e 5 implementados

- `/`: entrada por PIN;
- `/join/:pin`: escolha e validação de nickname;
- `/play/:sessionId`: confirmação e espera do participante;
- `/host`: criação de sessão;
- `/host/:sessionId`: PIN, QR Code, participantes e presença online;
- `/screen/:sessionId`: lobby de telão sincronizado.

Quando a sessão entra em `question_open`, as três rotas de sessão mudam de tela automaticamente:

- participante recebe A, B, C e D, envia uma resposta imutável e aguarda;
- apresentador vê pergunta, cronômetro, contagem ao vivo e encerra respostas;
- telão mostra pergunta, alternativas, cronômetro e volume de respostas.

Depois do encerramento, o apresentador controla cada etapa explicitamente:

- `question_result`: percentuais da sala, sem destacar a resposta;
- `answer_reveal`: alternativa correta e insight editorial;
- `ranking`: cinco primeiros colocados nos checkpoints definidos;
- `podium`: três primeiros colocados ao final da oitava pergunta;
- `ended`: encerramento formal da sessão.

## Sistema visual do telão

- assinatura superior compartilhada entre Snypse, magfiADS e smootAI;
- títulos condensados e pink Snypse para a hierarquia principal;
- fundo preto com grid, partículas, ondas pink e azul;
- cards escuros com contorno gradiente e brilho controlado;
- régua inferior de progresso para lobby, quiz, ranking e pódio;
- ajustes específicos para manter todo o conteúdo visível em 16:9.

Em desenvolvimento, `/design-preview/:stage` permite revisar `lobby`, `question`, `result`, `ranking` e `podium` sem criar dados falsos no Supabase. A rota não é incluída no fluxo de produção.

## Autoridade dos dados

1. O PostgreSQL é a fonte de verdade.
2. A Edge Function autentica a identidade anônima e chama funções transacionais usando a credencial de serviço.
3. As funções do banco validam autor, fase, versão e prazo.
4. Realtime Broadcast envia apenas uma invalidação segura.
5. O cliente busca um snapshot novo após cada invalidação ou reconexão.
6. Presence mantém somente o estado online/offline.

Nenhum evento Realtime contém resposta correta, alternativa individual ou pontuação ainda não revelada.

## API

A Edge Function `quiz-api` recebe `POST` com uma das ações:

| Ação | Responsável | Efeito |
| --- | --- | --- |
| `create-session` | Apresentador | Cria PIN e lobby |
| `join-session` | Participante | Reserva nickname na sessão |
| `submit-answer` | Participante | Registra uma única resposta |
| `host-command` | Apresentador | Executa transição ou encerra respostas |
| `snapshot` | Todos | Retorna dados filtrados por função e fase |

## Máquina de estados

```text
lobby
  -> question_open
  -> answers_closed
  -> question_result
  -> answer_reveal
  -> question_open | ranking | podium

ranking
  -> question_open | podium

podium
  -> ended
```

Toda transição recebe `expectedVersion`. A atualização só é aceita se esse valor for igual a `sessions.phase_version`, impedindo cliques duplicados e comandos de uma aba desatualizada.

## Pontuação

```text
incorreta = 0
correta = round(500 + 500 × (1 - response_ms / duration_ms))
```

O tempo é limitado ao intervalo da pergunta, portanto uma resposta correta vale de 500 a 1.000 pontos. O fechamento atualiza respostas e ranking na mesma transação.

## Desempate

1. Pontuação total decrescente.
2. Número de acertos decrescente.
3. Tempo acumulado das respostas corretas crescente.
4. Horário de entrada crescente.

## Segurança

- Anonymous Sign-Ins fornece um UUID sem pedir login ao usuário.
- O limite de autenticações anônimas deve ser elevado para 200/h, pois os celulares do evento podem compartilhar um único IP/NAT.
- RLS está habilitado em todas as tabelas públicas.
- Participantes não escrevem diretamente no banco.
- Funções de mutação só podem ser executadas por `service_role`.
- O banco confirma que o usuário informado é participante ou apresentador da sessão.
- Canais `session:<uuid>` são privados e autorizados por RLS em `realtime.messages`.
- A resposta correta só aparece no snapshot do telão/apresentador a partir de `answer_reveal`.

## Conteúdo editorial

A migration editorial cadastra oito perguntas e 32 alternativas fixas, derivadas do deck oficial do Road Show. Não existe editor de quiz nem conteúdo genérico. Os checkpoints de ranking estão definidos após as perguntas 2, 4 e 6.

## Cronômetro e resposta

- o servidor grava `question_opened_at` e `answer_deadline_at` ao abrir a pergunta;
- o snapshot devolve `serverNow`, permitindo ao cliente compensar diferenças de relógio;
- o cronômetro visual atualiza localmente, sem gerar tráfego a cada segundo;
- o banco rejeita respostas fora da fase ou depois do prazo;
- a restrição única `(session_id, question_id, participant_id)` impede uma segunda resposta;
- o encerramento pontua respostas e atualiza participantes em uma única transação.
