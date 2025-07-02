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
  { value: 'mL', label: 'Mililitro' },
  { value: 'L', label: 'Litro' },
  { value: 'g', label: 'Grama' },
  { value: 'kg', label: 'Quilograma' },
];

export const outros = [
  { value: 'un', label: 'Unidade' },
  { value: 'l', label: 'Litro' },
  { value: 'g', label: 'Grama' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'cx', label: 'Caixa' },
  { value: 'cam', label: 'Caminhão' },
];

export const materiais = [
  { value: 'VidroBorossilicato', label: 'Vidro Borossilicato' },
  { value: 'VidroSodaCal', label: 'Vidro Soda-Cal' },
  { value: 'Polimetilpentano', label: 'Polimetilpentano' },
  { value: 'Polipropileno', label: 'Polipropileno' },
  { value: 'Policarbonato', label: 'Policarbonato' },
  { value: 'Polietileno', label: 'Polietileno' },
  { value: 'Teflon', label: 'Teflon' },
  { value: 'Agata', label: 'Ágata' },
  { value: 'Aluminio', label: 'Alumínio' },
  { value: 'Quartzo', label: 'Quartzo' },
  { value: 'Poliestireno', label: 'Poliestireno' },
  { value: 'AcoInoxidavel', label: 'Aço Inoxidável' },
  { value: 'Outro', label: 'Outro' },
  { value: 'Indefinido', label: 'Indefinido' },
];

export const formatos = [
  { value: 'Cilindrica', label: 'Cilíndrica' },
  { value: 'Conica', label: 'Cônica' },
  { value: 'Esferica', label: 'Esférica' },
  { value: 'CilindricaComBaseLarga', label: 'Cilíndrica com Base Larga' },
  { value: 'Pipeta', label: 'Pipeta' },
  { value: 'Funil', label: 'Funil' },
  { value: 'Plana', label: 'Plana' },
  { value: 'ConicaInvertida', label: 'Cônica Invertida' },
  { value: 'Coluna', label: 'Coluna' },
  { value: 'TuboFormaU', label: 'Tubo em Forma de U' },
  { value: 'Oval', label: 'Oval' },
  { value: 'Disco', label: 'Disco' },
  { value: 'Outro', label: 'Outro' },
  { value: 'Indefinido', label: 'Indefinido' },
];

export const grausPureza = [
  { value: 'Alta', label: 'Alta' },
  { value: 'Intermediaria', label: 'Intermediária' },
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Indefinido', label: 'Indefinido' },
];

export const TrueFalse = [
  { value: 'true', label: 'Sim' },
  { value: 'false', label: 'Não' },
];

export type ChemicalData = {
  codigo: string;
  nome: string;
  lote: string;
  numeroAleatorio: string;
  numeroMinimo: string;
  data: string;
};

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
  { value: 'Utilizador', width: '25%' },
  { value: 'Identificador', width: '20%' },
  { value: 'Lote', width: '15%' },
  { value: 'Quantidade', width: '12%' },
  { value: 'Unidade', width: '13%' },
];

export const columnsButtons = [
  { value: 'Nome', width: '25%' },
  { value: 'Email', width: '25%' },
  { value: 'Instituição', width: '20%' },
  { value: 'Curso', width: '15%' },
  { value: 'Status', width: '15%' },
];

export const columnsApproval = [
  { value: 'Data de Solicitação', width: '20%' },
  { value: 'Nome', width: '30%' },
  { value: 'Email', width: '40%' },
  { value: 'Ação', width: '10%' },
];

export const columnsApproval22 = [
  { value: 'Data de Solicitação', width: '20%' },
  { value: 'Nome', width: '30%' },
  { value: 'Email', width: '20%' },
  { value: 'Instituição', width: '20%' },
  { value: 'Ação', width: '10%' },
];

export const columnsLoan = [
  { value: 'Código', width: '25%' },
  { value: 'Data de Uso', width: '25%' },
  { value: 'Quant. Itens Utilizados', width: '25%' },
  { value: 'Status', width: '25%' },
];

export const columns = [
  { value: 'Nome', width: '30%' },
  { value: 'Quantidade Atual', width: '17.5%' },
  { value: 'Quantidade Mínima', width: '17.5%' },
  { value: 'Data de Validade', width: '17.5%' },
  { value: 'Status', width: '17.5%' },
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

export const columnsItensSelected = [
  { value: 'Código', width: '15%' },
  { value: 'Nome', width: '25%' },
  { value: 'Tipo', width: '20%' },
  { value: 'Quantidade', width: '20%' },
  { value: 'Lote ID', width: '20%' },
];

export const loanCreationHeader = [
  { value: 'Código', width: '20%' },
  { value: 'Nome do Produto', width: '40%' },
  { value: 'Quantidade', width: '30%' },
  { value: 'Ação', width: '10%' },
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
  { value: 'Email', width: '25%' },
  { value: 'Telefone', width: '30%' },
];

export const returnLoanCol = [
  { value: 'Item', width: '25%' },
  { value: 'Quantidade', width: '15%' },
  { value: 'Devolução', width: '15%' },
  { value: 'Justificativa', width: '45%' },
];

export const returnLoanColTx = [
  { value: 'Item', width: '40%' },
  { value: 'Quantidade', width: '20%' },
  { value: 'Unidade de Medida', width: '20%' },
  { value: 'Lote ID', width: '20%' },
];
export const estudantesSelected = [
  ['Ana Beatriz', 'UFPE', 'Engenharia de Software'],
  ['Carlos Eduardo', 'USP', 'Medicina'],
  ['Mariana Silva', 'UNICAMP', 'Direito'],
];

export const columnsHistories = [
  { value: 'Id', width: '10%' },
  { value: 'Mentorado Vinculado', width: '30%' },
  { value: 'Data', width: '20%' },
  { value: 'Itens Utilizados', width: '20%' },
  { value: 'Status', width: '20%' },
];

export const columnsClass = [
  { value: 'Nome', width: '22%' },
  { value: 'Email', width: '22%' },
  { value: 'Data Ingresso', width: '15%' },
  { value: 'Curso', width: '16%' },
  { value: 'Instituição', width: '15%' },
  { value: 'Status', width: '10%' },
];

export const columnsDisabled = [
  { value: 'Nome', width: '22%' },
  { value: 'Email', width: '22%' },
  { value: 'Data Desativação', width: '15%' },
  { value: 'Curso', width: '16%' },
  { value: 'Instituição', width: '15%' },
  { value: 'Ação', width: '10%' },
];

export const unidadesMedida = [
  { value: 'Litro', label: 'Litro' },
  { value: 'Mililitro', label: 'Mililitro' },
  { value: 'Metro_cubico', label: 'Metro Cúbico' },
  { value: 'Grama', label: 'Grama' },
  { value: 'Quilograma', label: 'Quilograma' },
  { value: 'Tonelada', label: 'Tonelada' },
  { value: 'Centimetro_cubico', label: 'Centímetro Cúbico' },
  { value: 'Miligrama', label: 'Miligrama' },
  { value: 'Unidade', label: 'Unidade' },
  { value: 'Metro', label: 'Metro' },
  { value: 'Centimetro', label: 'Centímetro' },
  { value: 'Milimetro', label: 'Milímetro' },
  { value: 'Outro', label: 'Outro' },
  { value: 'Indefinido', label: 'Indefinido' },
];

export const getUnidadeSigla = (value: string): string => {
  const siglas: Record<string, string> = {
    Litro: 'L',
    Mililitro: 'mL',
    Metro_cubico: 'm³',
    Grama: 'g',
    Quilograma: 'kg',
    Tonelada: 't',
    Centimetro_cubico: 'cm³',
    Miligrama: 'mg',
    Unidade: 'un.',
    Metro: 'm',
    Centimetro: 'cm',
    Milimetro: 'mm',
    Outro: 'Outro',
    Indefinido: 'N/D',
  };

  return siglas[value] || value;
};

// Função para pluralizar unidades de medida
export const getUnidadePlural = (value: string, quantidade: number): string => {
  const plurais: Record<string, { singular: string; plural: string }> = {
    Litro: {
      singular: 'litro',
      plural: 'litros',
    },
    Mililitro: {
      singular: 'mililitro',
      plural: 'mililitros',
    },
    Metro_cubico: {
      singular: 'metro cúbico',
      plural: 'metros cúbicos',
    },
    Grama: {
      singular: 'grama',
      plural: 'gramas',
    },
    Quilograma: {
      singular: 'quilograma',
      plural: 'quilogramas',
    },
    Tonelada: {
      singular: 'tonelada',
      plural: 'toneladas',
    },
    Centimetro_cubico: {
      singular: 'centímetro cúbico',
      plural: 'centímetros cúbicos',
    },
    Miligrama: {
      singular: 'miligrama',
      plural: 'miligramas',
    },
    Unidade: {
      singular: 'unidade',
      plural: 'unidades',
    },
    Metro: {
      singular: 'metro',
      plural: 'metros',
    },
    Centimetro: {
      singular: 'centímetro',
      plural: 'centímetros',
    },
    Milimetro: {
      singular: 'milímetro',
      plural: 'milímetros',
    },
    Outro: {
      singular: 'outro',
      plural: 'outros',
    },
    Indefinido: {
      singular: 'indefinido',
      plural: 'indefinidos',
    },
  };

  const unidade = plurais[value];
  if (!unidade) return value;

  return quantidade === 1 ? unidade.singular : unidade.plural;
};

export const categoriasQuimicas = [
  { value: 'Acido', label: 'Ácido' },
  { value: 'Base', label: 'Base' },
  { value: 'Oxido', label: 'Óxido' },
  { value: 'Sal', label: 'Sal' },
  { value: 'Hidroxido', label: 'Hidróxido' },
  { value: 'Outros', label: 'Outros' },
  { value: 'Indefinido', label: 'Indefinido' },
];

export const registros = [
  {
    nomeLaboratorio: 'Laboratório de Análises Clínicas',
    localizacao: 'Pesqueira / Pernambuco',
    data: '02/06/2024',
    responsavel: 'Dr. Carlos Silva',
    quantidade: '25un',
    produto: 'Luvas descartáveis',
    motivo: 'Falta de material',
    ativo: true,
  },
  {
    nomeLaboratorio: 'Laboratório de Engenharia Biomédica',
    localizacao: 'Recife / Pernambuco',
    data: '10/06/2024',
    responsavel: 'Dra. Mariana Souza',
    quantidade: '50un',
    produto: 'Sensores cardíacos',
    motivo: 'Estoque em excesso',
    ativo: false,
  },
  {
    nomeLaboratorio: 'Laboratório de Química Aplicada',
    localizacao: 'Caruaru / Pernambuco',
    data: '15/06/2024',
    responsavel: 'Prof. João Mendes',
    quantidade: '10un',
    produto: 'Reagente químico X',
    motivo: 'Validade próxima',
    ativo: true,
  },
  {
    nomeLaboratorio: 'Laboratório de Microbiologia',
    localizacao: 'Garanhuns / Pernambuco',
    data: '20/06/2024',
    responsavel: 'Dra. Fernanda Lima',
    quantidade: '30un',
    produto: 'Placas de Petri',
    motivo: 'Falta de material',
    ativo: false,
  },
  {
    nomeLaboratorio: 'Laboratório de Tecnologia Molecular',
    localizacao: 'Petrolina / Pernambuco',
    data: '25/06/2024',
    responsavel: 'Dr. Eduardo Rocha',
    quantidade: '40un',
    produto: 'Pipetas automáticas',
    motivo: 'Estoque em excesso',
    ativo: true,
  },
  {
    nomeLaboratorio: 'Laboratório de Física Experimental',
    localizacao: 'Arcoverde / Pernambuco',
    data: '28/06/2024',
    responsavel: 'Prof. Ricardo Almeida',
    quantidade: '15un',
    produto: 'Osciloscópios',
    motivo: 'Validade próxima',
    ativo: false,
  },
  {
    nomeLaboratorio: 'Laboratório de Biotecnologia',
    localizacao: 'Olinda / Pernambuco',
    data: '30/06/2024',
    responsavel: 'Dra. Camila Torres',
    quantidade: '20un',
    produto: 'Culturas celulares',
    motivo: 'Falta de material',
    ativo: true,
  },
  {
    nomeLaboratorio: 'Laboratório de Ciências Ambientais',
    localizacao: 'Paulista / Pernambuco',
    data: '05/07/2024',
    responsavel: 'Dr. Roberto Nascimento',
    quantidade: '35un',
    produto: 'Kits de análise de água',
    motivo: 'Estoque em excesso',
    ativo: false,
  },
  {
    nomeLaboratorio: 'Laboratório de Farmacologia',
    localizacao: 'São Lourenço da Mata / Pernambuco',
    data: '10/07/2024',
    responsavel: 'Dra. Beatriz Mendes',
    quantidade: '18un',
    produto: 'Comprimidos experimentais',
    motivo: 'Validade próxima',
    ativo: true,
  },
  {
    nomeLaboratorio: 'Laboratório de Nanotecnologia',
    localizacao: 'Cabo de Santo Agostinho / Pernambuco',
    data: '15/07/2024',
    responsavel: 'Dr. Leonardo Fernandes',
    quantidade: '22un',
    produto: 'Nanopartículas de sílica',
    motivo: 'Falta de material',
    ativo: false,
  },
];
