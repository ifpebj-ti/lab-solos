export const unidades = [
  { value: 'm', label: 'Metro (m)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 's', label: 'Segundo (s)' },
  { value: 'A', label: 'Ampère (A)' },
  { value: 'K', label: 'Kelvin (K)' },
  { value: 'mol', label: 'Mol (mol)' },
  { value: 'cd', label: 'Candela (cd)' },
  { value: 'Hz', label: 'Hertz (Hz)' },
  { value: 'N', label: 'Newton (N)' },
  { value: 'Pa', label: 'Pascal (Pa)' },
  { value: 'J', label: 'Joule (J)' },
  { value: 'W', label: 'Watt (W)' },
  { value: 'C', label: 'Coulomb (C)' },
  { value: 'V', label: 'Volt (V)' },
  { value: 'F', label: 'Farad (F)' },
  { value: 'Ω', label: 'Ohm (Ω)' },
  { value: 'S', label: 'Siemens (S)' },
  { value: 'Wb', label: 'Weber (Wb)' },
  { value: 'T', label: 'Tesla (T)' },
  { value: 'H', label: 'Henry (H)' },
  { value: 'lm', label: 'Lúmen (lm)' },
  { value: 'lx', label: 'Lux (lx)' },
  { value: 'Bq', label: 'Becquerel (Bq)' },
  { value: 'Gy', label: 'Gray (Gy)' },
  { value: 'Sv', label: 'Sievert (Sv)' },
  { value: 'kat', label: 'Katal (kat)' },
];

export const options = [
  { value: 'sais', label: 'Sais' },
  { value: 'acidos', label: 'Ácidos' },
  { value: 'base', label: 'Base' },
  { value: 'gases', label: 'Gases' },
];

export const medidas = [
  { value: 'ml', label: 'Mililitro' },
  { value: 'l', label: 'Litro' },
  { value: 'g', label: 'Grama' },
  { value: 'kg', label: 'Quilo' },
];

export const outros = [
  { value: 'uni', label: 'Unidade' },
  { value: 'l', label: 'Litro' },
  { value: 'g', label: 'Grama' },
  { value: 'kg', label: 'Quilo' },
  { value: 'cx', label: 'Caixa' },
  { value: 'cm', label: 'Caminhão' },
];

export const vidrarias = [
  { value: 'pipeta', label: 'Pipeta' },
  { value: 'bureta', label: 'Bureta' },
  { value: 'proveta', label: 'Proveta (Cilindro Graduado)' },
  { value: 'bequer', label: 'Béquer' },
  { value: 'erlenmeyer', label: 'Erlenmeyer' },
  { value: 'balao_volumetrico', label: 'Balão Volumétrico' },
  { value: 'funil', label: 'Funil' },
  { value: 'dessecador', label: 'Dessecador' },
  { value: 'condensador', label: 'Condensador' },
  { value: 'placa_petri', label: 'Placa de Petri' },
  { value: 'frasco_reagentes', label: 'Frasco de Reagentes' },
  { value: 'balao_fundo_redondo', label: 'Balão de Fundo Redondo' },
  { value: 'tubo_ensaio', label: 'Tubo de Ensaio' },
  { value: 'kitasato', label: 'Kitasato' },
  { value: 'vidro_relogio', label: 'Vidro de Relógio' },
];

export type ChemicalData = {
  codigo: string;
  nome: string;
  lote: string;
  numeroAleatorio: string;
  numeroMinimo: string;
  data: string;
};

const elements: string[] = [
  'Hidrogênio',
  'Hélio',
  'Lítio',
  'Berílio',
  'Boro',
  'Carbono',
  'Nitrogênio',
  'Oxigênio',
  'Flúor',
  'Neônio',
  'Sódio',
  'Magnésio',
];

export function generateRandomData(): ChemicalData[] {
  const data: ChemicalData[] = [];

  for (let i = 0; i < 12; i++) {
    const codigo = Math.floor(10000000 + Math.random() * 90000000).toString();
    const nome = elements[i % elements.length];
    const lote = Math.floor(10000 + Math.random() * 90000).toString();
    const numeroAleatorio = (Math.random() * 1000).toFixed(
      Math.random() < 0.5 ? 0 : 2
    );
    const numeroMinimo = (Math.random() * 10).toFixed(2);
    const dataAtual = new Date(Date.now() - Math.floor(Math.random() * 1e10))
      .toISOString()
      .split('T')[0];

    data.push({
      codigo,
      nome,
      lote,
      numeroAleatorio,
      numeroMinimo,
      data: dataAtual,
    });
  }
  return data;
}

export const lotes = [
  { value: '0001', label: 'Lote 0001' },
  { value: '0002', label: 'Lote 0002' },
  { value: '0003', label: 'Lote 0003' },
  { value: '0004', label: 'Lote 0004' },
];

export const chartData = [
  { month: 'January', desktop: 186 },
  { month: 'February', desktop: 125 },
  { month: 'March', desktop: 197 },
  { month: 'April', desktop: 193 },
  { month: 'May', desktop: 209 },
  { month: 'June', desktop: 264 },
  { month: 'July', desktop: 146 },
  { month: 'Agost', desktop: 165 },
  { month: 'September', desktop: 237 },
  { month: 'Octuber', desktop: 143 },
  { month: 'November', desktop: 209 },
  { month: 'December', desktop: 214 },
];

export const columnsVer = [
  { value: 'Data', width: '15%' },
  { value: 'Utilizador', width: '30%' },
  { value: 'Identificador', width: '25%' },
  { value: 'Lote', width: '15%' },
  { value: 'Quantidade', width: '15%' },
];

export const columnsButtons = [
  { value: 'Utilizador', width: '45%' },
  { value: 'Identificador', width: '40%' },
  { value: 'Lote', width: '15%' },
];

export const columnsLoan = [
  { value: 'Código', width: '25%' },
  { value: 'Data de Uso', width: '25%' },
  { value: 'Quant. Itens Utilizados', width: '25%' },
  { value: 'Status', width: '25%' },
];

export const columns = [
  { value: 'Nome', width: '20%' },
  { value: 'Endereço', width: '30%' },
  { value: 'Profissão', width: '30%' },
  { value: 'Email', width: '20%' },
];
export const dataVer = [
  {
    date: '2023-08-15',
    name: 'Maria Oliveira',
    institution: 'Universidade de São Paulo',
    code: '4823',
    quantity: '5',
  },
  {
    date: '2024-02-10',
    name: 'João Silva',
    institution: 'Universidade Federal do Rio de Janeiro',
    code: '1924',
    quantity: '8',
  },
  {
    date: '2022-11-23',
    name: 'Ana Souza',
    institution: 'Universidade Estadual de Campinas',
    code: '3019',
    quantity: '3',
  },
  {
    date: '2023-06-14',
    name: 'Carlos Lima',
    institution: 'Universidade Federal de Minas Gerais',
    code: '7193',
    quantity: '10',
  },
  {
    date: '2024-01-28',
    name: 'Beatriz Santos',
    institution: 'Universidade de Brasília',
    code: '8451',
    quantity: '7',
  },
  {
    date: '2023-09-30',
    name: 'Rafael Almeida',
    institution: 'Universidade Federal do Ceará',
    code: '2156',
    quantity: '6',
  },
  {
    date: '2024-03-05',
    name: 'Fernanda Costa',
    institution: 'Universidade Federal de Santa Catarina',
    code: '9073',
    quantity: '4',
  },
  {
    date: '2022-10-19',
    name: 'Luiz Pereira',
    institution: 'Universidade Federal do Pará',
    code: '1348',
    quantity: '2',
  },
  {
    date: '2023-07-25',
    name: 'Carolina Ramos',
    institution: 'Universidade Federal do Rio Grande do Sul',
    code: '4981',
    quantity: '9',
  },
  {
    date: '2024-04-11',
    name: 'Felipe Ferreira',
    institution: 'Universidade Estadual Paulista',
    code: '3629',
    quantity: '5',
  },
  {
    date: '2023-05-02',
    name: 'Larissa Mendes',
    institution: 'Universidade Federal de Pernambuco',
    code: '6514',
    quantity: '8',
  },
  {
    date: '2024-06-18',
    name: 'Ricardo Barbosa',
    institution: 'Universidade Federal de Goiás',
    code: '2765',
    quantity: '6',
  },
  {
    date: '2023-12-22',
    name: 'Juliana Rocha',
    institution: 'Universidade Federal da Bahia',
    code: '3892',
    quantity: '3',
  },
  {
    date: '2024-07-08',
    name: 'Gustavo Souza',
    institution: 'Universidade Federal do Paraná',
    code: '7432',
    quantity: '10',
  },
  {
    date: '2023-03-17',
    name: 'Vanessa Ribeiro',
    institution: 'Universidade Federal do Amazonas',
    code: '5817',
    quantity: '7',
  },
];

export const dataButton = [
  {
    name: 'Maria Oliveira',
    institution: 'Universidade de São Paulo',
    code: '4823',
  },
  {
    name: 'João Silva',
    institution: 'Universidade Federal do Rio de Janeiro',
    code: '1924',
  },
  {
    name: 'Ana Souza',
    institution: 'Universidade Estadual de Campinas',
    code: '3019',
  },
  {
    name: 'Carlos Lima',
    institution: 'Universidade Federal de Minas Gerais',
    code: '7193',
  },
  {
    name: 'Beatriz Santos',
    institution: 'Universidade de Brasília',
    code: '8451',
  },
  {
    name: 'Rafael Almeida',
    institution: 'Universidade Federal do Ceará',
    code: '2156',
  },
  {
    name: 'Fernanda Costa',
    institution: 'Universidade Federal de Santa Catarina',
    code: '9073',
  },
  {
    name: 'Luiz Pereira',
    institution: 'Universidade Federal do Pará',
    code: '1348',
  },
  {
    name: 'Carolina Ramos',
    institution: 'Universidade Federal do Rio Grande do Sul',
    code: '4981',
  },
  {
    name: 'Felipe Ferreira',
    institution: 'Universidade Estadual Paulista',
    code: '3629',
  },
  {
    name: 'Larissa Mendes',
    institution: 'Universidade Federal de Pernambuco',
    code: '6514',
  },
  {
    name: 'Ricardo Barbosa',
    institution: 'Universidade Federal de Goiás',
    code: '2765',
  },
  {
    name: 'Juliana Rocha',
    institution: 'Universidade Federal da Bahia',
    code: '3892',
  },
  {
    name: 'Gustavo Souza',
    institution: 'Universidade Federal do Paraná',
    code: '7432',
  },
  {
    name: 'Vanessa Ribeiro',
    institution: 'Universidade Federal do Amazonas',
    code: '5817',
  },
];

export const testData = [
  ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
  ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
  ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
  ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
  ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
  ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
  ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
  ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
  ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
  ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
  ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
  ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
  ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
  ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
  ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
  ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
  ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
  ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
  ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
  ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
  ['Pedro', 'Rua A, 123', 'Engenheiro', 'pedro@email.com'],
  ['Ana', 'Av. B, 456', 'Médica', 'ana@email.com'],
  ['João', 'Rua C, 789', 'Professor', 'joao@email.com'],
  ['Carla', 'Av. D, 101', 'Advogada', 'carla@email.com'],
  // Adicione mais dados conforme necessário
];

export const columnsItensSelected = [
  { value: 'Código', width: '15%' },
  { value: 'Nome', width: '25%' },
  { value: 'Tipo', width: '20%' },
  { value: 'Quantidade', width: '20%' },
  { value: 'Grandeza', width: '20%' },
];

export const itensSelected = [
  ['001', 'Sódio', 'sal', '500', 'grama'],
  ['002', 'Cloro', 'ácido', '250', 'mililitro'],
  ['003', 'Potássio', 'base', '300', 'mililitro'],
  ['004', 'Magnésio', 'sal', '1000', 'grama'],
  ['005', 'Flúor', 'ácido', '500', 'mililitro'],
];

export const columnsEstudantesSelected = [
  { value: 'Nome', width: '45%' },
  { value: 'Instituição', width: '25%' },
  { value: 'Curso', width: '30%' },
];
export const estudantesSelected = [
  ['Ana Beatriz', 'UFPE', 'Engenharia de Software'],
  ['Carlos Eduardo', 'USP', 'Medicina'],
  ['Mariana Silva', 'UNICAMP', 'Direito'],
];
