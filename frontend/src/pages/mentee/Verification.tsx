import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import DateRangeInput from '@/components/global/inputs/DateRangeInput';
import { lotes, chartData, columnsVer, dataVer } from '@/mocks/Unidades';
import SelectInput from '@/components/global/inputs/SelectInput';
import SearchInput from '@/components/global/inputs/SearchInput';
import InfoContainer from '@/components/screens/InfoContainer';
import Pagination from '@/components/global/table/Pagination';
import HeaderTable from '@/components/global/table/Header';
import OpenSearch from '@/components/global/OpenSearch';
import ItemTable from '@/components/global/table/Item';
import { getProductById } from '@/integration/Product';
import { formatDate } from '@/function/date';
import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import LoadingIcon from '../../../public/icons/LoadingIcon';
const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

interface IProduto {
  catmat: string; // Código do material
  unidadeMedida: string; // Unidade de medida representada por um número
  estadoFisico: number; // Estado físico representado por um número
  cor: number; // Código representando a cor
  odor: number; // Código representando o odor
  densidade: number; // Densidade do produto
  pesoMolecular: number; // Peso molecular do produto
  grauPureza: string; // Grau de pureza, em formato string (ex.: '98%')
  formulaQuimica: string; // Fórmula química do produto
  grupo: number; // Grupo químico representado por um número
  id: number; // ID único do produto
  nomeProduto: string; // Nome do produto
  fornecedor: string; // Nome do fornecedor
  tipoProduto: string; // Tipo do produto representado por um número
  quantidade: number; // Quantidade disponível do produto
  quantidadeMinima: number; // Quantidade mínima recomendada
  dataFabricacao: string | null; // Data de fabricação em formato ISO 8601 ou null
  dataValidade: string; // Data de validade em formato ISO 8601
  localizacaoProduto: string; // Localização física do produto
  status: number; // Status do produto representado por um número
  ultimaModificacao: string; // Data da última modificação em formato ISO 8601
  loteId: number; // ID do lote associado ao produto
  lote: string | null; // Informações do lote ou null
  emprestimo: string | null; // Informações sobre empréstimo ou null
  capacidade: string | number;
  altura: string;
  formato: string;
  graduada: string;
  material: string;
}

function VerificationMentee() {
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [productsById, setProductsById] = useState<IProduto>();
  const location = useLocation();
  const id = location.state?.id; // Recupera o ID passado via state

  useEffect(() => {
    const fetchProductsById = async () => {
      try {
        const processedRegisteredUsers = await getProductById({ id });
        setProductsById(processedRegisteredUsers);
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
        { title: 'Fórmula', value: productsById.formulaQuimica, width: '20%' },
        { title: 'Grupo', value: productsById.grupo, width: '20%' },
        { title: 'Situação', value: productsById.status, width: '20%' },
      ]
    : [];

  const infoItemsVidraria = productsById
    ? [
        { title: 'Item', value: productsById.nomeProduto, width: '40%' },
        {
          title: 'Capacidade (ml)',
          value: productsById.capacidade,
          width: '20%',
        },
        { title: 'Tipo', value: productsById.tipoProduto, width: '20%' },
        { title: 'Situação', value: productsById.status, width: '20%' },
      ]
    : [];

  const infoItemsOutros = productsById
    ? [
        { title: 'Item', value: productsById.nomeProduto, width: '40%' },
        { title: 'Tipo', value: productsById.tipoProduto, width: '20%' },
        { title: 'Situação', value: productsById.status, width: '20%' },
        {
          title: 'Data de Validade',
          value: formatDate(productsById.dataValidade),
          width: '20%',
        },
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
  const infoItems2Vd = productsById
    ? [
        {
          title: 'Estoque Atual (Un)',
          value: productsById?.quantidade,
          width: '100%',
        },
      ]
    : [];
  const infoItems3 = productsById
    ? [
        {
          title: 'Última Modificação do Estoque',
          value: formatDate(productsById?.ultimaModificacao),
          width: '100%',
        },
      ]
    : [];

  const infoItems6 = productsById
    ? [
        {
          title: 'Localização',
          value: productsById?.localizacaoProduto,
          width: '100%',
        },
      ]
    : [];

  const infoItems5 = productsById
    ? [
        {
          title: 'Data de Validade',
          value: formatDate(productsById?.dataValidade),
          width: '100%',
        },
      ]
    : [];

  const moreInformationsQuimico = productsById
    ? [
        {
          title: 'Localização',
          value: productsById.localizacaoProduto,
          width: '40%',
        },
        {
          title: 'Catmat',
          value: productsById.catmat,
          width: '20%',
        },
        {
          title: 'Unidade de Medida',
          value: productsById.unidadeMedida,
          width: '20%',
        },
      ]
    : [];
  const moreInformationsVidraria = productsById
    ? [
        {
          title: 'Localização',
          value: productsById.localizacaoProduto,
          width: '40%',
        },
        {
          title: 'Catmat',
          value: productsById.catmat ?? 'Não corresponde',
          width: '20%',
        },
        {
          title: 'Altura',
          value: productsById.altura,
          width: '20%',
        },

        {
          title: 'Capacidade (ml)',
          value: productsById.capacidade,
          width: '20%',
        },
      ]
    : [];

  const moreInformationsVidraria2 = productsById
    ? [
        {
          title: 'Material',
          value: productsById.material,
          width: '40%',
        },
      ]
    : [];
  const moreInformationsVidraria3 = productsById
    ? [
        {
          title: 'Altura',
          value: productsById.altura,
          width: '40%',
        },
      ]
    : [];
  const moreInformationsVidraria4 = productsById
    ? [
        {
          title: 'Formato',
          value: productsById.formato,
          width: '40%',
        },
      ]
    : [];

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const currentData = dataVer.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
          {productsById?.tipoProduto === 'Quimico' && (
            <div className='w-11/12 mt-7'>
              <InfoContainer items={infoItems} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems5} />
                <InfoContainer items={infoItems3} />
              </div>
              <div className='w-full mt-7 min-h-9'>
                <Accordion
                  type='single'
                  collapsible
                  className='w-full bg-backgroundMy px-4 border border-borderMy rounded-md font-inter-medium text-clt-2'
                >
                  <AccordionItem value='item-1'>
                    <AccordionTrigger>Mais Informações</AccordionTrigger>
                    <AccordionContent>
                      <InfoContainer items={moreInformationsQuimico} />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          )}
          {productsById?.tipoProduto === 'Vidraria' && (
            <div className='w-11/12 mt-7'>
              <InfoContainer items={infoItemsVidraria} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2Vd} />
                <InfoContainer items={infoItems5} />
                <InfoContainer items={infoItems3} />
              </div>
              <div className='w-full mt-7 min-h-9'>
                <Accordion
                  type='single'
                  collapsible
                  className='w-full bg-backgroundMy px-4 border border-borderMy rounded-md font-inter-medium text-clt-2'
                >
                  <AccordionItem value='item-1'>
                    <AccordionTrigger>Mais Informações</AccordionTrigger>
                    <AccordionContent>
                      <InfoContainer items={moreInformationsVidraria} />
                      <div className='w-full flex gap-x-8 mt-5'>
                        <InfoContainer items={moreInformationsVidraria2} />
                        <InfoContainer items={moreInformationsVidraria3} />
                        <InfoContainer items={moreInformationsVidraria4} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          )}
          {productsById?.tipoProduto === 'Outro' && (
            <div className='w-11/12 mt-7'>
              <InfoContainer items={infoItemsOutros} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems3} />
                <InfoContainer items={infoItems6} />
              </div>
            </div>
          )}
          <div className='w-11/12 mt-7'>
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
          <div className='border border-borderMy rounded-md w-11/12 min-h-96 flex flex-col items-center mt-10 p-4 mb-11'>
            <div className='w-full flex justify-between items-center mt-2 gap-x-7'>
              <div className='w-2/4'>
                <SearchInput
                  name='search'
                  onChange={(e) => setSearchTerm(e.target.value)} // Atualiza o estado 'searchTerm'
                  value={searchTerm}
                />
              </div>
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
            <HeaderTable columns={columnsVer} />
            <div className='w-full items-center flex flex-col justify-between min-h-72'>
              <div className='w-full'>
                {currentData.map((rowData, index) => (
                  <ItemTable
                    key={index}
                    data={[
                      rowData.date,
                      rowData.name,
                      rowData.institution,
                      rowData.code,
                      rowData.quantity + 'un',
                    ]}
                    rowIndex={index}
                    columnWidths={columnsVer.map((column) => column.width)}
                  />
                ))}
              </div>
              {/* Componente de Paginação */}
              <Pagination
                totalItems={dataVer.length}
                itemsPerPage={itemsPerPage}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
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

export default VerificationMentee;
