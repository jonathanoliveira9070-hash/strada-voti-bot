import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { InterpretacaoIA } from '../types';

const genAI = new GoogleGenerativeAI(config.geminiApiKey);

const SYSTEM_PROMPT = `
Você é o módulo de interpretação de linguagem natural do bot "Strada - VOTI (Estoque)",
um assistente de controle de estoque de materiais e ferramentas usadas em um carro de trabalho
(ex: instalador de rede/elétrica). Sua única tarefa é ler a mensagem do usuário e devolver
APENAS um JSON válido (sem markdown, sem texto extra) com esta estrutura:

{
  "intencao": "movimentacao" | "consulta_quantidade" | "consulta_ferramenta" | "desconhecido",
  "item": string opcional (nome do material ou ferramenta citado),
  "quantidade": number opcional,
  "unidade": string opcional (ex: "metros", "unidade", "caixa", "pacote", "rolo", "litro"),
  "tipo_movimentacao": "entrada" | "saida" | "ajuste" opcional,
  "cliente_ou_fornecedor": string opcional,
  "observacoes": string opcional,
  "confianca": number entre 0 e 1
}

Regras:
- "usei", "peguei", "retire", "retirei", "gastei", "instalei" => tipo_movimentacao "saida"
- "comprei", "adicione", "entraram", "entrou", "chegou", "recebi" => tipo_movimentacao "entrada"
- Se a mensagem disser "acabou X" ou "estou sem X", trate como intencao "consulta_quantidade"
  sobre o item X (o usuário está avisando que zerou, não pedindo para dar baixa).
- Perguntas como "quanto tenho de X", "tenho X suficiente", "onde está X", "qual ferramenta está emprestada"
  são "consulta_quantidade" ou "consulta_ferramenta", conforme o caso.
- Se não conseguir identificar quantidade numérica mas o usuário disser um número por extenso
  (ex: "duas canaletas"), converta para número.
- Se não tiver certeza do que o usuário quis dizer, use intencao "desconhecido" e confianca baixa.
- Nunca invente itens ou quantidades que não estejam na mensagem.
`.trim();

export async function interpretarMensagem(mensagem: string): Promise<InterpretacaoIA> {
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const resultado = await model.generateContent(mensagem);
  const conteudo = resultado.response.text();

  if (!conteudo) {
    return { intencao: 'desconhecido', confianca: 0 };
  }

  try {
    const json = JSON.parse(conteudo);
    return {
      intencao: json.intencao ?? 'desconhecido',
      item: json.item,
      quantidade: typeof json.quantidade === 'number' ? json.quantidade : undefined,
      unidade: json.unidade,
      tipo_movimentacao: json.tipo_movimentacao,
      cliente_ou_fornecedor: json.cliente_ou_fornecedor,
      observacoes: json.observacoes,
      confianca: typeof json.confianca === 'number' ? json.confianca : 0.5,
    };
  } catch (erro) {
    console.error('Falha ao interpretar resposta da IA:', erro, conteudo);
    return { intencao: 'desconhecido', confianca: 0 };
  }
}
