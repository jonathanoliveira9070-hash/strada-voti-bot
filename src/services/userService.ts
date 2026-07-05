import { pool } from '../database/db';
import { Papel, Usuario } from '../types';

export async function obterOuCriarUsuario(telegramId: string, nome?: string): Promise<Usuario> {
  const existente = await pool.query<Usuario>('SELECT * FROM usuarios WHERE telegram_id = $1', [
    telegramId,
  ]);
  if (existente.rows[0]) return existente.rows[0];

  // Novo usuário entra como "consulta" por padrão; um administrador precisa promovê-lo
  const criado = await pool.query<Usuario>(
    'INSERT INTO usuarios (telegram_id, nome, papel) VALUES ($1, $2, $3) RETURNING *',
    [telegramId, nome ?? null, 'consulta']
  );
  return criado.rows[0];
}

export async function definirPapel(telegramId: string, papel: Papel): Promise<void> {
  await pool.query('UPDATE usuarios SET papel = $1 WHERE telegram_id = $2', [papel, telegramId]);
}

export function podeEditar(usuario: Usuario): boolean {
  return usuario.papel === 'administrador' || usuario.papel === 'funcionario';
}

export function ehAdministrador(usuario: Usuario): boolean {
  return usuario.papel === 'administrador';
}

export async function registrarLog(
  usuarioTelegramId: string | undefined,
  acao: string,
  detalhes?: string
): Promise<void> {
  await pool.query('INSERT INTO logs (usuario_telegram_id, acao, detalhes) VALUES ($1, $2, $3)', [
    usuarioTelegramId ?? null,
    acao,
    detalhes ?? null,
  ]);
}
