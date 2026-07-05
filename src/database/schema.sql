-- Strada - VOTI (Estoque) - schema do banco de dados (PostgreSQL / Supabase)

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  nome TEXT,
  papel TEXT NOT NULL DEFAULT 'consulta' CHECK (papel IN ('administrador', 'funcionario', 'consulta')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materiais (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  categoria TEXT,
  quantidade_atual NUMERIC NOT NULL DEFAULT 0,
  unidade TEXT NOT NULL DEFAULT 'unidade',
  quantidade_minima NUMERIC NOT NULL DEFAULT 0,
  quantidade_ideal NUMERIC NOT NULL DEFAULT 0,
  local_armazenado TEXT,
  observacoes TEXT,
  codigo_interno TEXT,
  valor_unitario NUMERIC DEFAULT 0,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ferramentas (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'emprestada', 'manutencao', 'perdida')),
  emprestada_para TEXT,
  local_armazenado TEXT,
  observacoes TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimentacoes (
  id SERIAL PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materiais(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade NUMERIC NOT NULL,
  cliente_ou_fornecedor TEXT,
  observacoes TEXT,
  usuario_telegram_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  usuario_telegram_id TEXT,
  acao TEXT NOT NULL,
  detalhes TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_material ON movimentacoes(material_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_criado_em ON movimentacoes(criado_em);
CREATE INDEX IF NOT EXISTS idx_materiais_nome ON materiais(nome);
