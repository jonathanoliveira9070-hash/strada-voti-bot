import { Telegraf, Context } from 'telegraf';
import * as materiaisService from '../services/materialsService';
import * as toolsService from '../services/toolsService';
import * as shoppingListService from '../services/shoppingListService';
import * as movementService from '../services/movementService';
import * as reportsService from '../services/reportsService';
import * as userService from '../services/userService';
import { Usuario, Material } from '../types';

function formatarMaterial(m: Material): string {
  return `• ${m.nome}: ${m.quantidade_atual} ${m.unidade}`;
}

export function registrarComandos(
  bot: Telegraf,
  obterUsuario: (ctx: Context) => Promise<Usuario>
) {
  bot.command('status', async (ctx) => {
    const [materiais, abaixoDoMinimo, emprestadas, perdidas] = await Promise.all([
      materiaisService.listarMateriais(),
      materiaisService.listarMateriaisAbaixoDoMinimo(),
      toolsService.listarFerramentasPorStatus('emprestada'),
      toolsService.listarFerramentasPorStatus('perdida'),
    ]);

    ctx.reply(
      [
        '📦 *Status do estoque — Strada VOTI*',
        `Total de materiais cadastrados: ${materiais.length}`,
        `Itens abaixo do mínimo: ${abaixoDoMinimo.length}`,
        `Ferramentas emprestadas: ${emprestadas.length}`,
        `Ferramentas perdidas: ${perdidas.length}`,
      ].join('\n'),
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('estoque', async (ctx) => {
    const materiais = await materiaisService.listarMateriais();
    if (materiais.length === 0) {
      ctx.reply('Nenhum material cadastrado ainda. Use /adicionar para começar.');
      return;
    }
    const porCategoria = new Map<string, string[]>();
    for (const m of materiais) {
      const cat = m.categoria ?? 'Sem categoria';
      const lista = porCategoria.get(cat) ?? [];
      lista.push(formatarMaterial(m));
      porCategoria.set(cat, lista);
    }
    // "Sem categoria" sempre por último
    const entradas = Array.from(porCategoria.entries()).sort((a, b) => {
      if (a[0] === 'Sem categoria') return 1;
      if (b[0] === 'Sem categoria') return -1;
      return a[0].localeCompare(b[0]);
    });
    const texto = entradas.map(([cat, linhas]) => `*${cat}*\n${linhas.join('\n')}`).join('\n\n');
    ctx.reply(texto, { parse_mode: 'Markdown' });
  });

  bot.command('lista', async (ctx) => ctx.reply(await shoppingListService.gerarListaDeCompras()));
  bot.command('compras', async (ctx) => ctx.reply(await shoppingListService.gerarListaDeCompras()));

  bot.command('historico', async (ctx) => {
    const termos = ctx.message?.text.split(' ').slice(1).join(' ');
    const historico = await movementService.buscarHistorico({
      materialNome: termos || undefined,
      limite: 15,
    });

    if (historico.length === 0) {
      ctx.reply('Nenhuma movimentação encontrada.');
      return;
    }

    const texto = historico
      .map((h) => {
        const sinal = h.tipo === 'entrada' ? '+' : h.tipo === 'saida' ? '-' : '±';
        const quem = h.cliente_ou_fornecedor ? ` (${h.cliente_ou_fornecedor})` : '';
        return `${h.criado_em}\n${sinal}${h.quantidade} ${h.material_nome}${quem}`;
      })
      .join('\n\n');

    ctx.reply(texto);
  });

  bot.command('ferramentas', async (ctx) => {
    const ferramentas = await toolsService.listarFerramentas();
    if (ferramentas.length === 0) {
      ctx.reply('Nenhuma ferramenta cadastrada ainda.');
      return;
    }
    const emojiStatus: Record<string, string> = {
      disponivel: '✅',
      emprestada: '📤',
      manutencao: '🔧',
      perdida: '❌',
    };
    const texto = ferramentas
      .map((f) => `${emojiStatus[f.status]} ${f.nome}${f.emprestada_para ? ` — com ${f.emprestada_para}` : ''}`)
      .join('\n');
    ctx.reply(texto);
  });

  bot.command('relatorio', async (ctx) => {
    ctx.reply(await reportsService.relatorioCompleto(), { parse_mode: 'Markdown' });
  });

  bot.command('categoria', async (ctx) => {
    const usuario = await obterUsuario(ctx);
    if (!userService.podeEditar(usuario)) {
      ctx.reply('Você não tem permissão para editar categorias. Fale com um administrador.');
      return;
    }

    const texto = ctx.message?.text.replace('/categoria', '').trim();
    if (!texto || !texto.includes('|')) {
      ctx.reply(
        [
          'Para definir a categoria de um material, use:',
          '`/categoria Nome do item | Nome da categoria`',
          '',
          'Exemplos:',
          '`/categoria BAP2 | Conectores`',
          '`/categoria Cordão Óptico UPC | Cordões Ópticos`',
          '',
          'Também dá para categorizar vários itens de uma vez, separando por vírgula antes do "|":',
          '`/categoria Splitter 1X2, Splitter 1X8 | Splitters`',
        ].join('\n'),
        { parse_mode: 'Markdown' }
      );
      return;
    }

    const [itensTexto, categoria] = texto.split('|').map((s) => s.trim());
    const nomesItens = itensTexto.split(',').map((s) => s.trim()).filter(Boolean);

    if (!categoria || nomesItens.length === 0) {
      ctx.reply('Não entendi o formato. Use: `/categoria Nome do item | Nome da categoria`', {
        parse_mode: 'Markdown',
      });
      return;
    }

    const atualizados: string[] = [];
    const naoEncontrados: string[] = [];

    for (const nomeItem of nomesItens) {
      const material = await materiaisService.buscarMaterialPorNome(nomeItem);
      if (!material) {
        naoEncontrados.push(nomeItem);
        continue;
      }
      await materiaisService.atualizarMaterial(material.id, { categoria });
      atualizados.push(material.nome);
    }

    const partes: string[] = [];
    if (atualizados.length > 0) {
      partes.push(`✅ Categoria "${categoria}" definida para: ${atualizados.join(', ')}`);
    }
    if (naoEncontrados.length > 0) {
      partes.push(`⚠️ Não encontrei: ${naoEncontrados.join(', ')}`);
    }
    ctx.reply(partes.join('\n\n'));
  });

  bot.command('adicionar', async (ctx) => {
    const usuario = await obterUsuario(ctx);
    if (!userService.podeEditar(usuario)) {
      ctx.reply('Você não tem permissão para adicionar itens. Fale com um administrador.');
      return;
    }
    ctx.reply(
      [
        'Para adicionar um material, me mande uma frase natural, por exemplo:',
        '"Adicione 2 caixas de canaleta"',
        '"Comprei 500 metros de cabo CAT6"',
        '',
        'Se o material ainda não existir, eu aviso e crio automaticamente.',
      ].join('\n')
    );
  });

  bot.command('remover', async (ctx) => {
    const usuario = await obterUsuario(ctx);
    if (!userService.podeEditar(usuario)) {
      ctx.reply('Você não tem permissão para remover itens. Fale com um administrador.');
      return;
    }
    ctx.reply(
      'Para dar baixa em um item, me mande uma frase natural, por exemplo: "Usei 30 metros de cabo CAT6" ou "Retire 5 parafusos".'
    );
  });
}