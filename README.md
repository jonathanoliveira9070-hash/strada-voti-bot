# Strada - VOTI (Estoque)

Bot de Telegram para controle de estoque de materiais e ferramentas transportadas no carro de trabalho.
Entenda mensagens em linguagem natural ("usei 30 metros de cabo CAT6"), controle o estoque, gere alertas
de reposição, lista de compras, histórico e relatórios — tudo pelo celular.

## Stack

- Node.js + TypeScript
- Telegraf (Telegram Bot API)
- Supabase (PostgreSQL) via `pg`
- Gemini (Google AI) — interpretação de linguagem natural, camada gratuita
- node-cron (backup diário agendado)

## Pré-requisitos

1. **Node.js 18+** instalado.
2. **Uma conta no Telegram** e um bot criado com o [@BotFather](https://t.me/BotFather) (ele te dá o `TELEGRAM_BOT_TOKEN`).
3. **Um projeto no [Supabase](https://supabase.com)** (gratuito para começar):
   - Crie o projeto.
   - Vá em *Project Settings → Database → Connection string → URI* e copie a connection string.
   - Essa é a sua `SUPABASE_DB_URL`.
4. **Uma chave de API do Gemini** (`GEMINI_API_KEY`), gratuita em https://aistudio.google.com/app/apikey.
5. (Opcional, para o backup automático) **`pg_dump`** instalado na máquina/servidor onde o bot vai rodar.

## Instalação

```bash
npm install
cp .env.example .env
```

Edite o `.env` preenchendo:

- `TELEGRAM_BOT_TOKEN`
- `GEMINI_API_KEY`
- `SUPABASE_DB_URL`
- `ADMIN_TELEGRAM_IDS` — seu ID numérico do Telegram (descubra conversando com [@userinfobot](https://t.me/userinfobot)).
  Quem estiver nessa lista vira administrador automaticamente na primeira execução.

## Rodando localmente

```bash
npm run dev
```

Isso conecta ao Supabase, cria as tabelas automaticamente (se ainda não existirem) e sobe o bot.
Abra o Telegram, procure seu bot pelo nome de usuário e mande `/start`.

## Rodando em produção

```bash
npm run build
npm start
```

Recomendado rodar com um gerenciador de processos (`pm2`, `systemd`) ou em um serviço como Railway/Render,
para o bot ficar sempre no ar.

## Permissões de usuário

Três papéis:

- **administrador** — acesso total, definido via `ADMIN_TELEGRAM_IDS` no `.env`.
- **funcionario** — pode registrar movimentações (entradas/saídas).
- **consulta** — só pode consultar, não pode alterar o estoque.

Novos usuários que conversam com o bot entram automaticamente como `consulta`. Para promover alguém,
um administrador precisa rodar uma atualização direta na tabela `usuarios` no Supabase (via SQL Editor):

```sql
UPDATE usuarios SET papel = 'funcionario' WHERE telegram_id = '123456789';
```

## Comandos

| Comando | O que faz |
|---|---|
| `/estoque` | Lista todos os materiais cadastrados, por categoria |
| `/lista` ou `/compras` | Lista de compras (itens abaixo do mínimo) |
| `/historico [item]` | Últimas movimentações (filtra por item, se informado) |
| `/ferramentas` | Status de todas as ferramentas |
| `/relatorio` | Relatório geral (consumo, itens parados, ferramentas, valor do estoque) |
| `/status` | Resumo rápido do estoque |
| `/adicionar` | Instruções para cadastrar um material |
| `/remover` | Instruções para dar baixa em um material |

## Linguagem natural

Fora dos comandos, qualquer mensagem é interpretada pela IA. Exemplos que funcionam:

- "Usei 30 metros de cabo CAT6"
- "Peguei 10 conectores RJ45"
- "Comprei mais 500 metros de cabo"
- "Adicione 2 caixas de canaleta"
- "Quanto tenho de RJ45?"
- "Onde está o alicate?"
- "Qual ferramenta está emprestada?"

Se o item citado em uma **entrada** não existir ainda no cadastro, o bot cria automaticamente.
Para **saídas** de itens inexistentes, ele pede para cadastrar primeiro (evita erro de digitação
criando itens duplicados sem querer).

## Alertas automáticos

Sempre que uma movimentação deixa um item com quantidade igual ou abaixo do mínimo cadastrado,
o bot envia automaticamente um alerta de reposição na conversa.

## Backup automático

Todo dia às 3h da manhã (horário do servidor onde o bot roda), é executado um `pg_dump` do banco
Supabase, salvo em `BACKUP_DIR` (padrão `./data/backups`). Ajuste o horário no `cron.schedule(...)`
em `src/index.ts` se quiser.

> O Supabase também mantém backups próprios automaticamente nos planos pagos — este backup local
> é uma camada extra de segurança, especialmente útil no plano gratuito.

## Cadastro inicial de materiais e ferramentas

Não existe (ainda) um comando de cadastro em massa — a forma mais rápida de popular o estoque é:

1. Pelo próprio bot: mande mensagens de entrada como "Comprei 305 metros de cabo CAT6", que o bot
   cria o material automaticamente (com quantidade mínima/ideal zeradas).
2. Depois, ajuste `quantidade_minima`, `quantidade_ideal`, `categoria` e `local_armazenado` direto
   no Supabase (Table Editor ou SQL Editor) — é mais rápido para cadastrar várias linhas de uma vez.
3. Para ferramentas, insira diretamente na tabela `ferramentas` pelo Supabase também.

## Estrutura do projeto

```
src/
  config.ts              # variáveis de ambiente
  types/                 # tipos TypeScript compartilhados
  database/
    schema.sql           # schema do banco (PostgreSQL/Supabase)
    db.ts                # conexão e inicialização
  services/
    materialsService.ts  # CRUD de materiais
    toolsService.ts       # CRUD de ferramentas
    movementService.ts    # movimentações e histórico
    shoppingListService.ts# lista de compras
    reportsService.ts     # relatórios
    userService.ts        # usuários e permissões
    backupService.ts       # backup via pg_dump
  ai/
    nlu.ts                # interpretação de linguagem natural via OpenAI
  bot/
    index.ts              # setup do Telegraf
    commands.ts           # comandos rápidos (/estoque, /lista, etc.)
    messageHandler.ts     # processa mensagens em linguagem natural
  index.ts                # entry point
```

## Próximos passos sugeridos (ainda não implementados)

Itens do escopo original que ficaram de fora desta primeira versão, para manter o projeto enxuto:

- Leitura de áudio (Telegram voice → texto)
- Leitura de código de barras / QR Code
- Cadastro automático via foto de nota fiscal (OCR)
- Modo offline com sincronização
- Exportação para Excel/PDF
- Controle de validade de materiais
- Cadastro de fornecedores e clientes com histórico vinculado
- Controle de custo por serviço
- Sugestão automática de reposição baseada em histórico de consumo

Cada um pode ser adicionado incrementalmente em cima dessa base sem reescrever o que já existe.
