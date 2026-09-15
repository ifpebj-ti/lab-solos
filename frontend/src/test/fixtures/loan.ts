export const loanUserFixture = {
  id: 7,
  nomeCompleto: 'Ada Lovelace',
  email: 'ada@example.test',
  telefone: null,
  dataIngresso: '2026-09-01',
  status: 'Habilitado',
  nivelUsuario: 'Mentorado',
  tipoUsuario: 'Academico',
  responsavel: null,
} as const;

export const loanProductFixture = {
  id: 101,
  catmat: 'CAT-101',
  nomeProduto: 'Produto sintético',
  tipoProduto: 'Quimico',
  fornecedor: null,
  unidadeMedida: 'ml',
  quantidade: 10,
  quantidadeMinima: 2,
  localizacaoProduto: 'Armário A',
  dataFabricacao: null,
  dataValidade: null,
  ultimaModificacao: '2026-09-01T10:00:00Z',
  status: 'Disponivel',
  lote: {
    codigoLote: 'L-101',
    fornecedor: null,
    dataFabricacao: null,
    dataValidade: null,
    dataEntrada: null,
    produtos: [],
  },
} as const;

export const loanFixture = {
  id: 42,
  dataRealizacao: '2026-09-01T10:00:00Z',
  dataPrevistaDevolucao: '2026-09-15T10:00:00Z',
  dataDevolucao: null,
  dataAprovacao: null,
  status: 'Pendente',
  produtos: [
    {
      emprestimoId: 42,
      produto: loanProductFixture,
      quantidade: 1,
    },
  ],
  solicitante: loanUserFixture,
  aprovador: null,
} as const;

export const loanListFixture = [loanFixture] as const;
