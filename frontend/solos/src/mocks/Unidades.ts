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
