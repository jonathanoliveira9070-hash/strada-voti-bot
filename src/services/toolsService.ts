import { pool } from '../database/db';
import { Ferramenta, StatusFerramenta } from '../types';

export async function criarFerramenta(nome: string, local_armazenado?: string): Promise<Ferramenta> {
  const result = await pool.query<Ferramenta>(
    'INSERT INTO ferramentas (nome, local_armazenado) VALUES ($1, $2) RETURNING *',
    [nome, local_armazenado ?? null]
  );
  return result.rows[0];
}

export async function buscarFerramentaPorId(id: number): Promise<Ferramenta | undefined> {
  const result = await pool.query<Ferramenta>('SELECT * FROM ferramentas WHERE id = $1', [id]);
  return result.rows[0];
}

export async function buscarFerramentaPorNome(nome: string): Promise<Ferramenta | undefined> {
  const result = await pool.query<Ferramenta>(
    'SELECT * FROM ferramentas WHERE nome ILIKE $1 ORDER BY LENGTH(nome) ASC LIMIT 1',
    [`%${nome.trim()}%`]
  );
  return result.rows[0];
}

export async function listarFerramentas(): Promise<Ferramenta[]> {
  const result = await pool.query<Ferramenta>('SELECT * FROM ferramentas ORDER BY nome');
  return result.rows;
}

export async function listarFerramentasPorStatus(status: StatusFerramenta): Promise<Ferramenta[]> {
  const result = await pool.query<Ferramenta>(
    'SELECT * FROM ferramentas WHERE status = $1 ORDER BY nome',
    [status]
  );
  return result.rows;
}

export async function atualizarStatusFerramenta(
  id: number,
  status: StatusFerramenta,
  emprestadaPara?: string
): Promise<Ferramenta> {
  const result = await pool.query<Ferramenta>(
    `UPDATE ferramentas SET status = $1, emprestada_para = $2, atualizado_em = now() WHERE id = $3 RETURNING *`,
    [status, status === 'emprestada' ? emprestadaPara ?? null : null, id]
  );
  return result.rows[0];
}

export async function removerFerramenta(id: number): Promise<void> {
  await pool.query('DELETE FROM ferramentas WHERE id = $1', [id]);
}
