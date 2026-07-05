import * as materiaisService from './materialsService';

export async function gerarListaDeCompras(): Promise<string> {
  const itensFaltantes = await materiaisService.listarMateriaisAbaixoDoMinimo();

  if (itensFaltantes.length === 0) {
    return '✅ Nenhum item em falta no momento. Estoque em dia!';
  }

  const linhas = itensFaltantes.map((item) => {
    const faltam = item.quantidade_ideal - item.quantidade_atual;
    return `☐ ${item.nome} (faltam ~${faltam > 0 ? faltam : item.quantidade_ideal} ${item.unidade})`;
  });

  return ['🛒 Lista de compras', '', ...linhas].join('\n');
}
