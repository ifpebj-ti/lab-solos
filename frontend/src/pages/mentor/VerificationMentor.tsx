import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import DateRangeInput from '@/components/global/inputs/DateRangeInput';
import { lotes, chartData } from '@/mocks/Unidades';
import { useLocation } from 'react-router-dom';
import SelectInput from '@/components/global/inputs/SelectInput';
import InfoContainer from '@/components/screens/InfoContainer';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import { getProductById } from '@/integration/Product';
import { formatDateTime } from '@/function/date';
import { useEffect, useState } from 'react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

// Interface base com propriedades comuns
interface ProdutoBase {
  id: number;
  nomeProduto: string;
  fornecedor: string;
  tipo: 'Quimico' | 'Vidraria' | 'Outro';
  quantidade: number;
  quantidadeMinima: number;
  dataFabricacao: string | null;
  dataValidade: string | null;
  localizacaoProduto: string;
  status: string;
  ultimaModificacao: string;
  loteId: number | null;
  lote: unknown | null;
  emprestimoProdutos: unknown[];
}

// Interface para produtos químicos
interface ProdutoQuimico extends ProdutoBase {
  tipo: 'Quimico';
  catmat: string;
  unidadeMedida: string;
  estadoFisico: string;
  cor: string;
  odor: string;
  densidade: number | null;
  pesoMolecular: number;
  grauPureza: string;
  formulaQuimica: string;
  grupo: string;
}

// Interface para vidrarias
interface ProdutoVidraria extends ProdutoBase {
  tipo: 'Vidraria';
  material: string;
  formato: string;
  altura: string;
  capacidade: number;
  graduada: boolean;
}

// Interface para outros produtos
interface ProdutoOutro extends ProdutoBase {
  tipo: 'Outro';
}

// Tipo unificado para suportar todos os casos
type Produto = ProdutoQuimico | ProdutoVidraria | ProdutoOutro;

function VerificationMentor() {
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState('');
  const [productsById, setProductsById] = useState<Produto>();
  const location = useLocation();
  const id = location.state?.id;

  useEffect(() => {
    const fetchProductsById = async () => {
      try {
        const processedGetUserById = await getProductById({ id });
        setProductsById(processedGetUserById);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar usuários', error);
        }
        setProductsById(undefined);
      } finally {
        setIsLoading(false); // Stop loading after fetch (success or failure)
      }
    };
    fetchProductsById();
  }, [id]);

  const infoItems = productsById
    ? [
        { title: 'Item', value: productsById.nomeProduto, width: '40%' },
        ...(productsById.tipo === 'Quimico'
          ? [
              {
                title: 'Fórmula',
                value: productsById.formulaQuimica,
                width: '20%',
              },
              { title: 'Grupo', value: productsById.grupo, width: '20%' },
            ]
          : []),
        { title: 'Situação', value: productsById.status, width: '20%' },
      ]
    : [];

  const infoItemsVidraria = productsById
    ? [
        { title: 'Item', value: productsById.nomeProduto, width: '40%' },
        ...(productsById.tipo === 'Vidraria'
          ? [
              {
                title: 'Capacidade',
                value: productsById.capacidade,
                width: '20%',
              },
              { title: 'Tipo', value: productsById.tipo, width: '20%' },
            ]
          : []),
        { title: 'Situação', value: productsById.status, width: '20%' },
      ]
    : [];

  const infoItemsOutro = productsById
    ? [
        { title: 'Item', value: productsById.nomeProduto, width: '50%' },
        ...(productsById.tipo === 'Outro'
          ? [{ title: 'Tipo', value: productsById.tipo, width: '25%' }]
          : []),
        { title: 'Situação', value: productsById.status, width: '25%' },
      ]
    : [];
  const infoItems2 = productsById
    ? [
        {
          title: 'Estoque Atual',
          value: productsById?.quantidade,
          width: '100%',
        },
      ]
    : [];
  const infoItems3 = productsById
    ? [
        {
          title: 'Última Inserção',
          value: formatDateTime(productsById?.ultimaModificacao),
          width: '100%',
        },
      ]
    : [];
  const infoItems4 = productsById
    ? [
        {
          title: 'Última Retirada',
          value: formatDateTime(productsById?.ultimaModificacao),
          width: '100%',
        },
      ]
    : [];

  return (
    <>
      {isLoading ? (
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : productsById != undefined ? (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Pesquisa
            </h1>
            <div className='flex items-center justify-between'>
              <OpenSearch />
            </div>
          </div>
          {productsById?.tipo === 'Quimico' && (
            <div className='w-11/12 mt-7'>
              <InfoContainer items={infoItems} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems3} />
                <InfoContainer items={infoItems4} />
              </div>
            </div>
          )}
          {productsById?.tipo === 'Vidraria' && (
            <div className='w-11/12 mt-7'>
              <InfoContainer items={infoItemsVidraria} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems3} />
                <InfoContainer items={infoItems4} />
              </div>
            </div>
          )}
          {productsById?.tipo === 'Outro' && (
            <div className='w-11/12 mt-7'>
              <InfoContainer items={infoItemsOutro} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems3} />
                <InfoContainer items={infoItems4} />
              </div>
            </div>
          )}
          <div className='w-11/12 mt-7 mb-6'>
            <Card className='rounded-md bg-backgroundMy border border-borderMy shadow-none'>
              <CardHeader>
                <div className='flex items-center justify-between w-full gap-x-7'>
                  <CardTitle className='font-inter-regular text-lg text-clt-2 font-medium w-1/2'>
                    Gráfico de Movimentação de Estoque
                  </CardTitle>
                  <div className='flex gap-x-7 w-1/2'>
                    <div className='w-1/2'>
                      <DateRangeInput />
                    </div>
                    <div className='-mt-4 w-1/2'>
                      <SelectInput
                        options={lotes}
                        onValueChange={(value) => setValue(value)}
                        value={value}
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className='pt-4'>
                <ChartContainer config={chartConfig} className='w-full h-80'>
                  <LineChart
                    className='w-full'
                    accessibilityLayer
                    data={chartData}
                    margin={{
                      left: 12,
                      right: 12,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <XAxis
                      dataKey='month'
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(value) => value.slice(0, 3)}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Line
                      dataKey='desktop'
                      type='linear'
                      stroke='var(--color-desktop)'
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-center items-center flex-col overflow-y-auto bg-backgroundMy font-inter-regular text-lg'>
          <p className=''>Erro durante requisição.</p>
          <Link
            to={'/'}
            className='px-5 py-2 mt-3 rounded-md bg-primaryMy text-white flex gap-x-2'
          >
            <ArrowLeft className='mt-[2px]' />
            Voltar
          </Link>
        </div>
      )}
    </>
  );
}

export default VerificationMentor;
