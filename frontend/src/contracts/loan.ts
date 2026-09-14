import { z } from 'zod';

import { usuarioSchema } from './user';

export type Lote = {
  codigoLote: string;
  fornecedor: string | null;
  dataFabricacao: string | null;
  dataValidade: string | null;
  dataEntrada: string | null;
  produtos: Produto[];
};

export type Produto = {
  id: number;
  catmat: string;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string | null;
  unidadeMedida: string | null;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string | null;
  dataFabricacao: string | null;
  dataValidade: string | null;
  ultimaModificacao: string;
  status: string | null;
  lote: Lote | null;
};

export const produtoSchema: z.ZodType<Produto> = z.lazy(() =>
  z.object({
    id: z.number().int(),
    catmat: z.string(),
    nomeProduto: z.string(),
    tipoProduto: z.string(),
    fornecedor: z.string().nullable(),
    unidadeMedida: z.string().nullable(),
    quantidade: z.number(),
    quantidadeMinima: z.number(),
    localizacaoProduto: z.string().nullable(),
    dataFabricacao: z.string().nullable(),
    dataValidade: z.string().nullable(),
    ultimaModificacao: z.string(),
    status: z.string().nullable(),
    lote: loteSchema.nullable(),
  })
);

export const loteSchema: z.ZodType<Lote> = z.lazy(() =>
  z.object({
    codigoLote: z.string(),
    fornecedor: z.string().nullable(),
    dataFabricacao: z.string().nullable(),
    dataValidade: z.string().nullable(),
    dataEntrada: z.string().nullable(),
    produtos: produtoSchema.array(),
  })
);

export const produtoEmprestadoSchema = z.object({
  emprestimoId: z.number().int(),
  produto: produtoSchema,
  quantidade: z.number(),
});

export const emprestimoSchema = z.object({
  id: z.number().int(),
  dataRealizacao: z.string(),
  dataDevolucao: z.string().nullable(),
  dataAprovacao: z.string().nullable(),
  status: z.string(),
  produtos: produtoEmprestadoSchema.array(),
  solicitante: usuarioSchema.nullable(),
  aprovador: usuarioSchema.nullable(),
});

export const emprestimosSchema = emprestimoSchema.array();

export type ProdutoEmprestado = z.infer<typeof produtoEmprestadoSchema>;
export type Emprestimo = z.infer<typeof emprestimoSchema>;
