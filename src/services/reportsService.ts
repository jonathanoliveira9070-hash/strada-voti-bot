import { pool } from '../database/db';
import * as materiaisService from './materialsService';
import * as toolsService from './toolsService';

export async function materiaisMaisUtilizados(limite = 5): Promise<string> {
  const result = await pool.query<{ nome: string; total: string; unidade: string }>(
    `SELECT mat.nome, SUM(m.quantidade) as total, mat.unidade
     FROM movimentacoes m
     JOIN materiais mat ON mat.id = m.material_id
     WHERE m.tipo = 'saida'
     GROUP BY mat.id, mat.nome, mat.unidade
     ORDER BY total DESC
     LIMIT $1`,
    [limite]
  );

  if (result.rows.length === 0) return 'Ainda não há saídas registradas.';
  return result.rows.map((r, i) => `${i + 1}. ${r.nome} — ${r.total} ${r.unidade}`).join('\n');
}

export async function consumoPorMes(mesesAtras = 1): Promise<string> {
  const result = await pool.query<{ mes: string; nome: string; total: string; unidade: string }>(
    `SELECT to_char(m.criado_em, 'YYYY-MM') as mes, mat.nome, SUM(m.quantidade) as total, mat.unidade
     FROM movimentacoes m
     JOIN materiais mat ON mat.id = m.material_id
     WHERE m.tipo = 'saida' AND m.criado_em >= now() - ($1 || ' months')::interval
     GROUP BY mes, mat.id, mat.nome, mat.unidade
     ORDER BY mes DESC, total DESC`,
    [mesesAtras]
  );

  if (result.rows.length === 0) return 'Sem consumo registrado no período.';

  const porMes = new Map<string, string[]>();
  for (const r of result.rows) {
    const lista = porMes.get(r.mes) ?? [];
    lista.push(`  • ${r.nome}: ${r.total} ${r.unidade}`);
    porMes.set(r.mes, lista);
  }

  return Array.from(porMes.entries())
    .map(([mes, linhas]) => `${mes}\n${linhas.join('\n')}`)
    .join('\n\n');
}

export async function itensProximosDoFim(): Promise<string> {
  const itens = await materiaisService.listarMateriaisAbaixoDoMinimo();
  if (itens.length === 0) return 'Nenhum item próximo do fim.';
  return itens
    .map((i) => `• ${i.nome}: ${i.quantidade_atual}/${i.quantidade_minima} ${i.unidade} (mínimo)`)
    .join('\n');
}

export async function itensSemMovimentacao(diasSemUso = 60): Promise<string> {
  const result = await pool.query<{ nome: string; unidade: string; quantidade_atual: number }>(
    `SELECT mat.nome, mat.unidade, mat.quantidade_atual
     FROM materiais mat
     WHERE mat.id NOT IN (
       SELECT material_id FROM movimentacoes
       WHERE criado_em >= now() - ($1 || ' days')::interval
     )`,
    [diasSemUso]
  );

  if (result.rows.length === 0) return `Todos os itens tiveram movimentação nos últimos ${diasSemUso} dias.`;
  return result.rows.map((r) => `• ${r.nome}: ${r.quantidade_atual} ${r.unidade}`).join('\n');
}

export async function ferramentasPerdidas(): Promise<string> {
  const ferramentas = await toolsService.listarFerramentasPorStatus('perdida');
  if (ferramentas.length === 0) return 'Nenhuma ferramenta perdida. 👍';
  return ferramentas.map((f) => `• ${f.nome}`).join('\n');
}

export async function ferramentasEmprestadas(): Promise<string> {
  const ferramentas = await toolsService.listarFerramentasPorStatus('emprestada');
  if (ferramentas.length === 0) return 'Nenhuma ferramenta emprestada no momento.';
  return ferramentas
    .map((f) => `• ${f.nome}${f.emprestada_para ? ` — com ${f.emprestada_para}` : ''}`)
    .join('\n');
}

export async function valorEstimadoEstoque(): Promise<string> {
  const total = await materiaisService.valorEstimadoEstoque();
  return `Valor estimado do estoque: R$ ${total.toFixed(2)}`;
}

export async function relatorioCompleto(): Promise<string> {
  const [maisUtilizados, proximosDoFim, semMovimentacao, emprestadas, perdidas, valor] = await Promise.all([
    materiaisMaisUtilizados(),
    itensProximosDoFim(),
    itensSemMovimentacao(),
    ferramentasEmprestadas(),
    ferramentasPerdidas(),
    valorEstimadoEstoque(),
  ]);

  return [
    '📊 *Relatório Geral — Strada VOTI*',
    '',
    '*Materiais mais utilizados:*',
    maisUtilizados,
    '',
    '*Itens próximos do fim:*',
    proximosDoFim,
    '',
    '*Itens sem movimentação (60 dias):*',
    semMovimentacao,
    '',
    '*Ferramentas emprestadas:*',
    emprestadas,
    '',
    '*Ferramentas perdidas:*',
    perdidas,
    '',
    valor,
  ].join('\n');
}
