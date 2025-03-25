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
  { value: 'Utilizador', width: '30%' },
  { value: 'Identificador', width: '25%' },
  { value: 'Lote', width: '15%' },
  { value: 'Quantidade', width: '15%' },
];

export const columnsButtons = [
  { value: 'Nome', width: '30%' },
  { value: 'Email', width: '30%' },
  { value: 'Instituição', width: '20%' },
  { value: 'Curso', width: '20%' },
];

export const columnsApproval = [
  { value: 'Data de Solicitação', width: '20%' },
  { value: 'Nome', width: '30%' },
  { value: 'Email', width: '20%' },
  { value: 'Responsável', width: '20%' },
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
    Unidade: 'un',
    Metro: 'm',
    Centimetro: 'cm',
    Milimetro: 'mm', // Corrigindo o erro de digitação para 'Milímetro'
    Outro: 'Outro',
    Indefinido: 'Indef',
  };

  return siglas[value] || value;
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
