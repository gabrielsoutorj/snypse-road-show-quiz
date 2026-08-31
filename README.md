# Snypse Road Show Quiz

Aplicação multiplayer em tempo real para o Road Show Snypse H2 2026.

## Estado atual — Build 6

Os Builds 1–6 contêm:

- fundação React, TypeScript, Vite e Tailwind;
- rotas reservadas para participante, apresentador e telão;
- autenticação anônima invisível;
- modelo de dados versionado em migrations;
- RLS e autorização de canais Realtime privados;
- funções transacionais para sessão, entrada, resposta, timer, pontuação e fases;
- Edge Function `quiz-api` com respostas diferentes por função;
- teste unitário da fórmula de pontuação.
- entrada mobile por PIN de seis dígitos;
- nickname validado e exclusivo por sessão;
- lobby do participante com confirmação e Presence;
- criação de sessão pelo apresentador;
- lobby do apresentador com PIN, QR Code e lista em tempo real;
- telão de lobby com QR Code e participantes conectados;
- mensagens claras quando o Supabase ainda não está conectado.
- oito perguntas fixas baseadas no conteúdo oficial do Road Show;
- abertura e encerramento de pergunta pelo apresentador;
- pergunta sincronizada no telão e no celular;
- cronômetro alinhado ao relógio do servidor;
- envio único de resposta, com bloqueio no prazo e confirmação visual;
- contagem de respostas ao vivo e pontuação calculada no encerramento.
- resultado percentual da sala sem antecipar a alternativa correta;
- reveal controlado da resposta correta e do insight editorial;
- ranking parcial automático nos checkpoints das perguntas 2, 4 e 6;
- pódio final com os três primeiros colocados;
- telas de acompanhamento e pontuação acumulada no celular.
- identidade visual final baseada nas cinco telas aprovadas;
- títulos condensados de alto impacto e assinatura das três marcas;
- ondas digitais, partículas, gradientes e contornos neon responsivos;
- régua visual de progresso entre lobby, quiz, ranking e pódio;
- adaptação das telas de telão para resoluções 16:9, incluindo 1280 × 720.

## Build 6 — concluído

- comando `pnpm dev:lan` para servir o frontend aos celulares na mesma rede;
- alerta quando o QR Code está usando `localhost` ou `127.0.0.1`;
- ensaio automatizado com até 100 participantes via `pnpm test:multi`;
- validação das oito perguntas, 160 respostas no cenário padrão, Realtime, ranking e pódio;
- checklist operacional em [`docs/event-operation.md`](docs/event-operation.md).
- projeto Supabase hospedado vinculado e configurado;
- quatro migrations aplicadas e `quiz-api` publicada;
- ensaio aprovado com 20 participantes, 160 respostas e 217 eventos Realtime;
- fluxo visual aprovado no navegador com apresentador, participante e telão reais.

Projeto Supabase ativo: `snypse-road-show-quiz`.

A especificação técnica consolidada está em [`docs/architecture.md`](docs/architecture.md).

## Configuração

1. Copie `.env.example` para `.env.local`.
2. Configure a URL e a publishable key do projeto Supabase.
3. Habilite Anonymous Sign-Ins no projeto hospedado.
4. Ajuste `Authentication > Rate Limits > Anonymous users` para pelo menos 200/h; participantes do evento podem compartilhar o mesmo IP.
5. Desabilite canais públicos em Realtime para exigir os canais privados.
6. Aplique as migrations e publique a função `quiz-api`.

## Desenvolvimento

```bash
npm install
npm run dev
```

Para executar o Supabase localmente é necessário um runtime compatível com Docker:

```bash
pnpm supabase:start
pnpm supabase:reset
```

## Validação

```bash
npm run lint
npm test
npm run build
```
