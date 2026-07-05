import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

export const pool = new Pool({
  connectionString: config.supabaseDbUrl,
  ssl: { rejectUnauthorized: false }, // exigido pela conexão do Supabase
});

export async function initDatabase(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schema);

  // Garante que os administradores definidos no .env existam como usuários
  for (const id of config.adminTelegramIds) {
    if (!id) continue;
    await pool.query(
      `INSERT INTO usuarios (telegram_id, nome, papel)
       VALUES ($1, $2, 'administrador')
       ON CONFLICT (telegram_id) DO UPDATE SET papel = 'administrador'`,
      [id, 'Administrador']
    );
  }

  console.log('Banco de dados (Supabase) inicializado com sucesso.');
}
