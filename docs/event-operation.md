# Operação e ensaio do Road Show

## 1. Publicação do Supabase

No projeto Supabase hospedado:

O projeto `snypse-road-show-quiz` está publicado sob a referência `nfrxvdyborrfojhbshqp`.

Configuração já aplicada:

1. `Anonymous Sign-Ins` habilitado;
2. ajustar o limite de usuários anônimos para pelo menos 200 por hora;
3. exigir canais privados no Realtime;
4. projeto vinculado à CLI;
5. migrations aplicadas;
6. função `quiz-api` publicada;
7. `.env.local` configurado apenas com URL e chave pública.

Criar `.env.local` a partir de `.env.example` e preencher a URL e a publishable key do projeto.

## 2. Ensaio automatizado

Com as mesmas variáveis disponíveis no terminal:

```bash
SMOKE_PARTICIPANTS=20 npm run test:multi
```

O ensaio cria uma sala descartável, autentica participantes anônimos, envia respostas nas oito perguntas, valida percentuais, reveal, checkpoints de ranking, pódio, encerramento e eventos Realtime.

Último resultado aprovado: 20 participantes, 160 respostas e 217 eventos Realtime.

## 3. Acesso dos celulares

Para executar o frontend no notebook durante o ensaio:

```bash
npm run dev:lan
```

Na rede usada durante a configuração, o painel fica em `http://192.168.0.90:5173/host`. O IP pode mudar quando o notebook trocar de Wi-Fi. Não abrir pelo endereço `127.0.0.1` ou `localhost`, pois o QR Code herdaria esse endereço e não funcionaria nos celulares.

## 4. Checklist antes do evento

- notebook conectado à energia e suspensão automática desabilitada;
- internet do local testada com o mesmo Wi-Fi dos celulares;
- painel do apresentador e telão abertos no mesmo navegador/perfil;
- zoom do telão em 100% e resolução 16:9;
- sessão de teste concluída com pelo menos cinco celulares físicos;
- PIN e QR Code legíveis do fundo da sala;
- uma pessoa responsável pelo painel e outra acompanhando entradas;
- evitar limpar dados do navegador depois de criar a sala, pois a identidade anônima do apresentador fica nesse navegador;
- criar uma nova sessão para cada apresentação.

## 5. Sequência do apresentador

1. criar sessão;
2. abrir telão;
3. aguardar participantes;
4. iniciar pergunta;
5. encerrar respostas ou aguardar o cronômetro;
6. mostrar resultado;
7. revelar resposta;
8. mostrar ranking quando o botão aparecer;
9. avançar até o pódio;
10. encerrar a sessão.
