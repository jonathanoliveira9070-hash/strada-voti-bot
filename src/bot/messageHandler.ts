import { Telegraf, Context } from 'telegraf';
import { interpretarMensagem } from '../ai/nlu';
import * as materiaisService from '../services/materialsService';
import * as toolsService from '../services/toolsService';
import * as movementService from '../services/movementService';
import * as userService from '../services/userService';
import { Usuario, Material } from '../types';

function alertaEstoqueBaixo(material: Material): string {
  return [
    '⚠️ *Atenção!*',
    '',
    `O item *${material.nome}* está abaixo do estoque mínimo.`,
    '',
    `Quantidade atual: ${material.quantidade_atual} ${material.unidade}`,
    `Quantidade ideal: ${material.quantidade_ideal} ${material.unidade}`,
    '',
    'Recomendação: repor o estoque.',
  ].join('\n');
}

export function registrarHandlerDeMensagens(
  bot: Telegraf,
  obterUsuario: (ctx: Context) => Promise<Usuario>
) {
  bot.on('text', async (ctx) => {
    const texto = ctx.message.text;
    if (texto.startsWith('/')) return; // comandos já tratados em commands.ts

    const usuario = await obterUsuario(ctx);

    let interpretacao;
    try {
      interpretacao = await interpretarMensagem(texto);
    } catch (erro) {
      console.error('Erro ao chamar a IA:', erro);
      ctx.reply('Não consegui entender agora (erro na IA). Pode tentar reformular ou usar /adicionar para ajuda?');
      return;
    }

    if (interpretacao.confianca < 0.4 || interpretacao.intencao === 'desconhecido') {
      ctx.reply(
        'Não tenho certeza do que você quis dizer. Pode reformular? Ex: "Usei 30 metros de cabo CAT6" ou "Quanto tenho de RJ45?"'
      );
      return;
    }

    switch (interpretacao.intencao) {
      case 'movimentacao': {
        if (!userService.podeEditar(usuario)) {
          ctx.reply('Você tem permissão apenas de consulta. Peça a um administrador para registrar essa movimentação.');
          return;
        }
        if (!interpretacao.item || !interpretacao.quantidade || !interpretacao.tipo_movimentacao) {
          ctx.reply('Entendi que é uma movimentação, mas faltou item, quantidade ou tipo. Pode detalhar melhor?');
          return;
        }

        let material = await materiaisService.buscarMaterialPorNome(interpretacao.item);

        if (!material) {
          if (interpretacao.tipo_movimentacao === 'entrada') {
            material = await materiaisService.criarMaterial({
              nome: interpretacao.item,
              unidade: interpretacao.unidade ?? 'unidade',
              quantidade_atual: 0,
            });
            ctx.reply(`Criei o material "${material.nome}" no cadastro, já que ele não existia.`);
          } else {
            ctx.reply(`Não encontrei "${interpretacao.item}" no cadastro. Use /adicionar para cadastrá-lo primeiro.`);
            return;
          }
        }

        const resultado = await movementService.registrarMovimentacao({
          materialId: material.id,
          tipo: interpretacao.tipo_movimentacao,
          quantidade: interpretacao.quantidade,
          clienteOuFornecedor: interpretacao.cliente_ou_fornecedor,
          observacoes: interpretacao.observacoes,
          usuarioTelegramId: String(ctx.from?.id),
        });

        await userService.registrarLog(
          String(ctx.from?.id),
          'movimentacao',
          `${interpretacao.tipo_movimentacao} ${interpretacao.quantidade} ${material.nome}`
        );

        const sinal = interpretacao.tipo_movimentacao === 'entrada' ? '+' : '-';
        await ctx.reply(
          `✅ Registrado: ${sinal}${interpretacao.quantidade} ${material.unidade} de ${material.nome}\nEstoque atual: ${resultado.material.quantidade_atual} ${material.unidade}`
        );

        if (resultado.ficouAbaixoDoMinimo) {
          await ctx.reply(alertaEstoqueBaixo(resultado.material), { parse_mode: 'Markdown' });
        }
        return;
      }

      case 'consulta_quantidade': {
        if (!interpretacao.item) {
          ctx.reply('De qual item você quer saber a quantidade?');
          return;
        }
        const material = await materiaisService.buscarMaterialPorNome(interpretacao.item);
        if (!material) {
          ctx.reply(`Não encontrei "${interpretacao.item}" no cadastro.`);
          return;
        }
        const suficiente = material.quantidade_atual > material.quantidade_minima;
        ctx.reply(
          [
            `${material.nome}: ${material.quantidade_atual} ${material.unidade}`,
            `Mínimo: ${material.quantidade_minima} ${material.unidade} | Ideal: ${material.quantidade_ideal} ${material.unidade}`,
            suficiente ? '✅ Estoque suficiente.' : '⚠️ Estoque abaixo do mínimo — considere repor.',
            material.local_armazenado ? `Local: ${material.local_armazenado}` : '',
          ]
            .filter(Boolean)
            .join('\n')
        );
        return;
      }

      case 'consulta_ferramenta': {
        if (interpretacao.item) {
          const ferramenta = await toolsService.buscarFerramentaPorNome(interpretacao.item);
          if (!ferramenta) {
            ctx.reply(`Não encontrei a ferramenta "${interpretacao.item}" no cadastro.`);
            return;
          }
          const statusTexto: Record<string, string> = {
            disponivel: 'disponível',
            emprestada: `emprestada${ferramenta.emprestada_para ? ` (com ${ferramenta.emprestada_para})` : ''}`,
            manutencao: 'em manutenção',
            perdida: 'perdida',
          };
          ctx.reply(
            [
              `${ferramenta.nome}: ${statusTexto[ferramenta.status]}`,
              ferramenta.local_armazenado ? `Local: ${ferramenta.local_armazenado}` : '',
            ]
              .filter(Boolean)
              .join('\n')
          );
        } else {
          const emprestadas = await toolsService.listarFerramentasPorStatus('emprestada');
          if (emprestadas.length === 0) {
            ctx.reply('Nenhuma ferramenta emprestada no momento.');
          } else {
            ctx.reply(
              emprestadas
                .map((f) => `• ${f.nome}${f.emprestada_para ? ` — com ${f.emprestada_para}` : ''}`)
                .join('\n')
            );
          }
        }
        return;
      }

      default:
        ctx.reply('Não entendi bem. Pode reformular?');
    }
  });
}
