import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}. Verifique seu arquivo .env`);
  }
  return value;
}

export const config = {
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
  geminiApiKey: required('GEMINI_API_KEY'),
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  supabaseDbUrl: required('SUPABASE_DB_URL'),
  backupDir: process.env.BACKUP_DIR || './data/backups',
  adminTelegramIds: (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean),
};
