import { pool } from '../database/db';
import { Movimentacao, TipoMovimentacao, Material } from '../types';
import * as materiaisService from './materialsService';

export interface RegistrarMovimentacaoInput {
  materialId: number;
  tipo: TipoMovimentacao;
  quantidade: number;
  clienteOuFornecedor?: string;
  observacoes?: string;
  usuarioTelegramId?: string;
}

export interface ResultadoMovimentacao {
  movimentacao: Movimentacao;
  material: Material;
  ficouAbaixoDoMinimo: boolean;
}

export async function registrarMovimentacao(
  input: RegistrarMovimentacaoInput
): Promise<ResultadoMovimentacao> {
  const material = await materiaisService.buscarMaterialPorId(input.materialId);
  if (!material) {
    throw new Error(`Material ${input.materialId} não encontrado`);
  }

  const delta =
    input.tipo === 'entrada'
      ? input.quantidade
      : input.tipo === 'saida'
      ? -input.quantidade
      : input.quantidade; // ajuste: quantidade já é o delta

  const novaQuantidade = material.quantidade_atual + delta;
  const materialAtualizado = await materiaisService.atualizarQuantidade(material.id, novaQuantidade);

  const result = await pool.query<Movimentacao>(
    `INSERT INTO movimentacoes
       (material_id, tipo, quantidade, cliente_ou_fornecedor, observacoes, usuario_telegram_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      material.id,
      input.tipo,
      input.quantidade,
      input.clienteOuFornecedor ?? null,
      input.observacoes ?? null,
      input.usuarioTelegramId ?? null,
    ]
  );

  return {
    movimentacao: result.rows[0],
    material: materialAtualizado,
    ficouAbaixoDoMinimo: materialAtualizado.quantidade_atual <= materialAtualizado.quantidade_minima,
  };
}

export async function buscarHistorico(
  opcoes: {
    materialNome?: string;
    dataInicio?: string;
    dataFim?: string;
    limite?: number;
  } = {}
): Promise<Array<Movimentacao & { material_nome: string }>> {
  const condicoes: string[] = ['1 = 1'];
  const params: any[] = [];

  if (opcoes.materialNome) {
    params.push(`%${opcoes.materialNome}%`);
    condicoes.push(`mat.nome ILIKE $${params.length}`);
  }
  if (opcoes.dataInicio) {
    params.push(opcoes.dataInicio);
    condicoes.push(`m.criado_em >= $${params.length}`);
  }
  if (opcoes.dataFim) {
    params.push(opcoes.dataFim);
    condicoes.push(`m.criado_em <= $${params.length}`);
  }

  params.push(opcoes.limite ?? 20);
  const query = `
    SELECT m.*, mat.nome as material_nome
    FROM movimentacoes m
    JOIN materiais mat ON mat.id = m.material_id
    WHERE ${condicoes.join(' AND ')}
    ORDER BY m.criado_em DESC
    LIMIT $${params.length}
  `;

  const result = await pool.query<Movimentacao & { material_nome: string }>(query, params);
  return result.rows;
}
