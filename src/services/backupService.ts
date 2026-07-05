import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function executarBackup(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }

    const arquivo = path.join(config.backupDir, `backup-${timestamp()}.sql`);

    // Requer o pg_dump instalado na máquina/servidor onde o bot roda
    // (na mesma versão major do Postgres do Supabase, geralmente a 15 ou 16)
    const comando = `pg_dump "${config.supabaseDbUrl}" --no-owner --no-privileges -f "${arquivo}"`;

    exec(comando, (erro, _stdout, stderr) => {
      if (erro) {
        console.error('Falha ao gerar backup:', stderr || erro.message);
        reject(erro);
        return;
      }
      console.log(`Backup gerado em: ${arquivo}`);
      resolve(arquivo);
    });
  });
}
