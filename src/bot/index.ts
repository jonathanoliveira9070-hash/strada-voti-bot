import { Telegraf, Context } from 'telegraf';
import { config } from '../config';
import * as userService from '../services/userService';
import { registrarComandos } from './commands';
import { registrarHandlerDeMensagens } from './messageHandler';
import { Usuario } from '../types';

export function criarBot(): Telegraf {
  const bot = new Telegraf(config.telegramBotToken);

  // Resolve (ou cria) o usuário a partir do Telegram, usado em toda checagem de permissão
  async function obterUsuario(ctx: Context): Promise<Usuario> {
    const telegramId = String(ctx.from?.id);
    const nome = ctx.from?.first_name;
    return userService.obterOuCriarUsuario(telegramId, nome);
  }

  bot.start(async (ctx) => {
    const usuario = await obterUsuario(ctx);
    ctx.reply(
      [
        `Olá, ${ctx.from?.first_name ?? ''}! 👋`,
        '',
        'Eu sou o *Strada - VOTI*, seu assistente de estoque do carro de trabalho.',
        '',
        `Seu nível de acesso atual é: *${usuario.papel}*.`,
        userService.podeEditar(usuario)
          ? 'Você pode registrar movimentações normalmente, em linguagem natural.'
          : 'Você tem acesso apenas de consulta. Peça a um administrador para liberar edição, se precisar.',
        '',
        'Experimente:',
        '"Usei 30 metros de cabo CAT6"',
        '"Quanto tenho de RJ45?"',
        '/status',
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });

  bot.help((ctx) => {
    ctx.reply(
      [
        'Comandos disponíveis:',
        '/estoque — lista todos os materiais',
        '/lista ou /compras — lista de compras (itens em falta)',
        '/historico [item] — histórico de movimentações',
        '/ferramentas — status das ferramentas',
        '/relatorio — relatório geral do estoque',
        '/status — resumo rápido',
        '/adicionar — instruções para cadastrar itens',
        '/remover — instruções para dar baixa em itens',
        '',
        'Ou simplesmente escreva em linguagem natural, por exemplo:',
        '"Peguei 10 conectores RJ45"',
        '"Onde está o alicate?"',
      ].join('\n')
    );
  });

  registrarComandos(bot, obterUsuario);
  registrarHandlerDeMensagens(bot, obterUsuario);

  bot.catch((erro, ctx) => {
    console.error('Erro não tratado no bot:', erro);
    ctx.reply('Ocorreu um erro inesperado. Já foi registrado no log — tente novamente em instantes.');
  });

  return bot;
}
