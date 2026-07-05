import { pool } from '../database/db';
import { Material } from '../types';

export interface NovoMaterial {
  nome: string;
  categoria?: string;
  quantidade_atual?: number;
  unidade?: string;
  quantidade_minima?: number;
  quantidade_ideal?: number;
  local_armazenado?: string;
  observacoes?: string;
  codigo_interno?: string;
  valor_unitario?: number;
}

export async function criarMaterial(dados: NovoMaterial): Promise<Material> {
  const result = await pool.query<Material>(
    `INSERT INTO materiais
       (nome, categoria, quantidade_atual, unidade, quantidade_minima, quantidade_ideal, local_armazenado, observacoes, codigo_interno, valor_unitario)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      dados.nome,
      dados.categoria ?? null,
      dados.quantidade_atual ?? 0,
      dados.unidade ?? 'unidade',
      dados.quantidade_minima ?? 0,
      dados.quantidade_ideal ?? 0,
      dados.local_armazenado ?? null,
      dados.observacoes ?? null,
      dados.codigo_interno ?? null,
      dados.valor_unitario ?? 0,
    ]
  );
  return result.rows[0];
}

export async function buscarMaterialPorId(id: number): Promise<Material | undefined> {
  const result = await pool.query<Material>('SELECT * FROM materiais WHERE id = $1', [id]);
  return result.rows[0];
}

// Busca "inteligente" por nome: tenta correspondência exata, depois aproximada (ILIKE)
export async function buscarMaterialPorNome(nome: string): Promise<Material | undefined> {
  const nomeNormalizado = nome.trim();

  const exato = await pool.query<Material>('SELECT * FROM materiais WHERE LOWER(nome) = LOWER($1)', [
    nomeNormalizado,
  ]);
  if (exato.rows[0]) return exato.rows[0];

  const aproximado = await pool.query<Material>(
    `SELECT * FROM materiais WHERE nome ILIKE $1 ORDER BY LENGTH(nome) ASC LIMIT 1`,
    [`%${nomeNormalizado}%`]
  );
  if (aproximado.rows[0]) return aproximado.rows[0];

  const porCodigo = await pool.query<Material>('SELECT * FROM materiais WHERE LOWER(codigo_interno) = LOWER($1)', [
    nomeNormalizado,
  ]);
  return porCodigo.rows[0];
}

export async function listarMateriais(): Promise<Material[]> {
  const result = await pool.query<Material>('SELECT * FROM materiais ORDER BY categoria, nome');
  return result.rows;
}

export async function listarMateriaisAbaixoDoMinimo(): Promise<Material[]> {
  const result = await pool.query<Material>(
    'SELECT * FROM materiais WHERE quantidade_atual <= quantidade_minima ORDER BY nome'
  );
  return result.rows;
}

export async function atualizarQuantidade(id: number, novaQuantidade: number): Promise<Material> {
  const result = await pool.query<Material>(
    `UPDATE materiais SET quantidade_atual = $1, atualizado_em = now() WHERE id = $2 RETURNING *`,
    [Math.max(0, novaQuantidade), id]
  );
  return result.rows[0];
}

export async function atualizarMaterial(
  id: number,
  dados: Partial<NovoMaterial>
): Promise<Material | undefined> {
  const atual = await buscarMaterialPorId(id);
  if (!atual) return undefined;

  const merged = { ...atual, ...dados };
  const result = await pool.query<Material>(
    `UPDATE materiais SET
       nome = $1, categoria = $2, unidade = $3, quantidade_minima = $4,
       quantidade_ideal = $5, local_armazenado = $6, observacoes = $7,
       codigo_interno = $8, valor_unitario = $9, atualizado_em = now()
     WHERE id = $10
     RETURNING *`,
    [
      merged.nome,
      merged.categoria,
      merged.unidade,
      merged.quantidade_minima,
      merged.quantidade_ideal,
      merged.local_armazenado,
      merged.observacoes,
      merged.codigo_interno,
      merged.valor_unitario,
      id,
    ]
  );
  return result.rows[0];
}

export async function removerMaterial(id: number): Promise<void> {
  await pool.query('DELETE FROM materiais WHERE id = $1', [id]);
}

export async function valorEstimadoEstoque(): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    'SELECT SUM(quantidade_atual * valor_unitario) as total FROM materiais'
  );
  return Number(result.rows[0]?.total ?? 0);
}
