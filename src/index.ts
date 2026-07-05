import cron from 'node-cron';
import { initDatabase } from './database/db';
import { criarBot } from './bot';
import { executarBackup } from './services/backupService';

async function main() {
  console.log('Iniciando Strada - VOTI (Estoque)...');

  await initDatabase();

  const bot = criarBot();

  // Backup automático diário às 3h da manhã (horário do servidor)
  cron.schedule('0 3 * * *', async () => {
    console.log('Executando backup diário agendado...');
    try {
      await executarBackup();
    } catch (erro) {
      console.error('Backup diário falhou:', erro);
    }
  });

  await bot.launch();
  console.log('Bot rodando! Pressione Ctrl+C para parar.');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch((erro) => {
  console.error('Erro fatal ao iniciar o sistema:', erro);
  process.exit(1);
});
