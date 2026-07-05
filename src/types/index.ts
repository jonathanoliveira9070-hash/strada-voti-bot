export type Papel = 'administrador' | 'funcionario' | 'consulta';

export interface Usuario {
  id: number;
  telegram_id: string;
  nome: string | null;
  papel: Papel;
  criado_em: string;
}

export interface Material {
  id: number;
  nome: string;
  categoria: string | null;
  quantidade_atual: number;
  unidade: string;
  quantidade_minima: number;
  quantidade_ideal: number;
  local_armazenado: string | null;
  observacoes: string | null;
  codigo_interno: string | null;
  valor_unitario: number;
  criado_em: string;
  atualizado_em: string;
}

export type StatusFerramenta = 'disponivel' | 'emprestada' | 'manutencao' | 'perdida';

export interface Ferramenta {
  id: number;
  nome: string;
  status: StatusFerramenta;
  emprestada_para: string | null;
  local_armazenado: string | null;
  observacoes: string | null;
  atualizado_em: string;
}

export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste';

export interface Movimentacao {
  id: number;
  material_id: number;
  tipo: TipoMovimentacao;
  quantidade: number;
  cliente_ou_fornecedor: string | null;
  observacoes: string | null;
  usuario_telegram_id: string | null;
  criado_em: string;
}

// Estrutura que a IA deve retornar ao interpretar uma mensagem em linguagem natural
export interface InterpretacaoIA {
  intencao:
    | 'movimentacao'
    | 'consulta_quantidade'
    | 'consulta_ferramenta'
    | 'desconhecido';
  item?: string;
  quantidade?: number;
  unidade?: string;
  tipo_movimentacao?: TipoMovimentacao;
  cliente_ou_fornecedor?: string;
  observacoes?: string;
  confianca: number; // 0 a 1
}
