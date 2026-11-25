import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { formatos, getUnidadePlural, grausPureza } from '@/mocks/Unidades';
import SearchInput from '@/components/global/inputs/SearchInput';
import HeaderTable from '@/components/global/table/Header';
import ItemOnly from '@/components/global/table/ItemOnly';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
import LoadingIcon from '@/components/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import ItemTable from '@/components/global/table/Item';
import ProductEditModal from '@/components/modals/ProductEditModal';
import { Button } from '@/components/ui/button';
import {
  getProductById,
  getProductHistoricoSaida,
  type HistoricoSaidaItem,
  type HistoricoSaidaProdutoResponse,
} from '@/integration/Product';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import ErrorFeedback from '@/components/global/ErrorFeedback';
import { OPERATION_IDS } from '@/errors/errorCatalog';
import {
  buildDetailUrl,
  readIdFromLocation,
} from '@/navigation/profileNavigation';

const verificationHistoryColumns: readonly ResponsiveColumn[] = [
  { key: 'date', label: 'Data', weight: 15 },
  { key: 'loan', label: 'Empréstimo', weight: 12 },
  { key: 'user', label: 'Solicitante', weight: 25 },
  { key: 'batch', label: 'Lote', weight: 15 },
  { key: 'quantity', label: 'Quantidade', weight: 12 },
  { key: 'unit', label: 'Unidade', weight: 13 },
];

interface IProduto {
  catmat: string;
  unidadeMedida: string;
  estadoFisico: number;
  cor: number;
  odor: number;
  densidade: number;
  pesoMolecular?: number | null;
  grauPureza: string;
  formulaQuimica: string;
  grupo?: string | number;
  id: number;
  nomeProduto: string;
  fornecedor: string;
  tipoProduto: string;
  quantidade: number;
  quantidadeMinima: number;
  dataFabricacao: string | null;
  dataValidade: string;
  localizacaoProduto: string;
  status: number;
  ultimaModificacao: string;
  loteId: number;
  lote: string | null;
  emprestimo: string | null;
  capacidade: string | number;
  altura?: string | null;
  formato?: string | null;
  graduada: string;
  material: string;
}

// Tipos de usuário
type UserType = 'admin' | 'mentor' | 'mentee';

interface VerificationProps {
  userType: UserType;
}

type ProductInfo = {
  key: string;
  title: string;
  value: string;
  width: string;
};

const formatPesoMolecular = (value?: number | null) =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(value)
    : 'Não informado';

const pageSettings: Record<UserType, { backRoute: string; title: string }> = {
  admin: {
    backRoute: '/admin/search-material',
    title: 'Verificação - Administrador',
  },
  mentor: {
    backRoute: '/mentor/search-material',
    title: 'Verificação - Mentor',
  },
  mentee: {
    backRoute: '/mentee/search-material',
    title: 'Verificação - Mentorado',
  },
};

function getClassification(product: IProduto) {
  if (product.tipoProduto === 'Vidraria') {
    return {
      key: 'category',
      title: 'Categoria',
      value:
        formatos.find((item) => item.value === product.formato)?.label ??
        product.formato ??
        '',
    };
  }

  return {
    key: 'group',
    title: 'Grupo',
    value: product.grupo?.toString() || 'N/A',
  };
}

function itemInfo(product: IProduto, width: string): ProductInfo {
  return { key: 'item', title: 'Item', value: product.nomeProduto, width };
}

function formulaInfo(product: IProduto, width: string): ProductInfo {
  return {
    key: 'formula',
    title: 'Fórmula',
    value: product.formulaQuimica,
    width,
  };
}

function molecularWeightInfo(product: IProduto): ProductInfo {
  return {
    key: 'molecular-weight',
    title: 'Peso Molecular (g/mol)',
    value: formatPesoMolecular(product.pesoMolecular),
    width: '15%',
  };
}

function statusInfo(product: IProduto, width: string): ProductInfo {
  return {
    key: 'status',
    title: 'Situação',
    value: product.status?.toString() || 'N/A',
    width,
  };
}

function getAdminProductInfo(
  product: IProduto,
  isChemical: boolean,
  isGlassware: boolean,
  showFormula: boolean,
  classification: ReturnType<typeof getClassification>
): ProductInfo[] {
  const result = [
    itemInfo(product, showFormula ? '20%' : isChemical ? '25%' : '30%'),
  ];
  if (showFormula) result.push(formulaInfo(product, '15%'));
  if (isChemical) result.push(molecularWeightInfo(product));

  result.push(
    {
      key: 'supplier',
      title: isChemical ? 'Marca' : 'Fornecedor',
      value: product.fornecedor,
      width: showFormula ? '17%' : isChemical ? '20%' : '25%',
    },
    { ...classification, width: isChemical ? '13%' : '15%' },
    statusInfo(product, showFormula ? '20%' : isChemical ? '27%' : '30%')
  );

  const height = product.altura;
  if (isGlassware && height && height !== 'Indefinido') {
    result.push({
      key: 'height',
      title: 'Altura',
      value: grausPureza.find((item) => item.value === height)?.label ?? height,
      width: '15%',
    });
  }
  return result;
}

function getMentorProductInfo(
  product: IProduto,
  isChemical: boolean,
  showFormula: boolean,
  classification: ReturnType<typeof getClassification>
): ProductInfo[] {
  const result = [
    itemInfo(product, showFormula ? '25%' : isChemical ? '35%' : '40%'),
  ];
  if (showFormula) result.push(formulaInfo(product, '20%'));
  if (isChemical) result.push(molecularWeightInfo(product));
  result.push(
    {
      ...classification,
      width: showFormula ? '20%' : isChemical ? '25%' : '30%',
    },
    statusInfo(product, showFormula ? '20%' : isChemical ? '25%' : '30%')
  );
  return result;
}

function getMenteeProductInfo(
  product: IProduto,
  isChemical: boolean,
  showFormula: boolean,
  classification: ReturnType<typeof getClassification>
): ProductInfo[] {
  const result = [
    itemInfo(product, showFormula ? '30%' : isChemical ? '45%' : '50%'),
  ];
  if (showFormula) result.push(formulaInfo(product, '25%'));
  if (isChemical) result.push(molecularWeightInfo(product));
  result.push({
    ...classification,
    width: showFormula ? '30%' : isChemical ? '40%' : '50%',
  });
  return result;
}

function getProductInfo(
  product: IProduto | undefined,
  userType: UserType
): ProductInfo[] {
  if (!product) return [];

  const isChemical = product.tipoProduto === 'Quimico';
  const isGlassware = product.tipoProduto === 'Vidraria';
  const showFormula = isChemical && Boolean(product.formulaQuimica?.trim());
  const classification = getClassification(product);

  switch (userType) {
    case 'admin':
      return getAdminProductInfo(
        product,
        isChemical,
        isGlassware,
        showFormula,
        classification
      );
    case 'mentor':
      return getMentorProductInfo(
        product,
        isChemical,
        showFormula,
        classification
      );
    case 'mentee':
      return getMenteeProductInfo(
        product,
        isChemical,
        showFormula,
        classification
      );
    default:
      return [];
  }
}

function shouldPromptProductSelection(
  hasValidQueryId: boolean,
  product: IProduto | undefined,
  loadError: unknown | null
): boolean {
  return !hasValidQueryId || (!product && loadError === null);
}

function shouldShowProductLoadError(
  product: IProduto | undefined,
  loadError: unknown | null
): boolean {
  return loadError !== null && !product;
}

// Configuração do gráfico
const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

function VerificationPage({ userType }: VerificationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [productsById, setProductsById] = useState<IProduto>();
  const [historicoData, setHistoricoData] =
    useState<HistoricoSaidaProdutoResponse | null>(null);
  const [filteredHistorico, setFilteredHistorico] = useState<
    HistoricoSaidaItem[]
  >([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const idResolution = readIdFromLocation(location);
  const hasValidQueryId =
    idResolution.source === 'query' && idResolution.id !== null;
  const hasLegacyId =
    idResolution.source === 'state' && idResolution.id !== null;
  const requestSequence = useRef(0);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [historyError, setHistoryError] = useState<unknown | null>(null);

  const { backRoute, title } = pageSettings[userType];

  // A API aplica o recorte permitido ao perfil autenticado.
  const showHistoricoDetalhado = true;
  const canEditProduct = userType === 'admin';

  useEffect(() => {
    if (!hasLegacyId || idResolution.id === null) return;
    navigate(
      buildDetailUrl(`${location.pathname}${location.search}`, idResolution.id),
      { replace: true, state: null }
    );
  }, [
    hasLegacyId,
    idResolution.id,
    location.pathname,
    location.search,
    navigate,
  ]);

  const fetchData = useCallback(async () => {
    if (!hasValidQueryId || idResolution.id === null) {
      setIsLoading(false);
      setProductsById(undefined);
      setHistoricoData(null);
      setHistoryError(null);
      setLoadError(null);
      return;
    }

    const sequence = ++requestSequence.current;
    setIsLoading(true);
    setProductsById(undefined);
    setHistoricoData(null);
    setHistoryError(null);
    setLoadError(null);
    try {
      const productResponse = await getProductById({ id: idResolution.id });
      if (sequence !== requestSequence.current) return;
      setProductsById(productResponse);

      try {
        const historicoResponse = await getProductHistoricoSaida({
          id: idResolution.id,
        });
        if (sequence !== requestSequence.current) return;
        setHistoricoData(historicoResponse);
        setFilteredHistorico(historicoResponse.historico);
      } catch (error) {
        if (sequence === requestSequence.current) {
          setHistoryError(error);
          setHistoricoData(null);
          setFilteredHistorico([]);
        }
      }
    } catch (error) {
      if (sequence === requestSequence.current) setLoadError(error);
    } finally {
      if (sequence === requestSequence.current) setIsLoading(false);
    }
  }, [hasValidQueryId, idResolution.id]);

  useEffect(() => {
    void fetchData();
    return () => {
      requestSequence.current += 1;
    };
  }, [fetchData]);

  // Filtros para histórico
  useEffect(() => {
    if (!historicoData) return;

    let filtered = historicoData.historico;

    if (searchTerm) {
      const query = searchTerm.trim().toLocaleLowerCase('pt-BR');
      filtered = filtered.filter((item) =>
        [
          item.emprestimoId.toString(),
          item.dataSaida,
          format(new Date(item.dataSaida), 'dd/MM/yyyy', { locale: ptBR }),
          item.solicitanteNome ?? '',
          item.lote ?? '',
          item.quantidadeEmprestada.toString(),
          item.unidadeMedida,
        ]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(query)
      );
    }

    setFilteredHistorico(filtered);
  }, [searchTerm, historicoData]);

  // Função para recarregar dados do produto após edição
  const handleProductUpdate = async () => {
    if (hasValidQueryId && idResolution.id !== null) {
      try {
        const productResponse = await getProductById({ id: idResolution.id });
        setProductsById(productResponse);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao recarregar dados do produto', error);
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className='flex min-h-[50vh] w-full flex-row items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'>
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando...
      </div>
    );
  }

  if (shouldPromptProductSelection(hasValidQueryId, productsById, loadError)) {
    return (
      <div className='flex min-h-[50vh] flex-col items-center justify-center gap-3 bg-canvas p-6 text-clt-2'>
        <p>Selecione um registro para consultar</p>
        <Link
          to={backRoute}
          aria-label='Voltar'
          title='Voltar'
          className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy hover:bg-surface-selected focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus'
        >
          <ArrowLeft aria-hidden='true' className='h-5 w-5' />
        </Link>
        <p className='text-clt-2 font-inter-medium'>Produto não encontrado.</p>
      </div>
    );
  }

  if (shouldShowProductLoadError(productsById, loadError)) {
    return (
      <div className='flex min-h-screen flex-col items-center justify-center gap-4 bg-backgroundMy p-6'>
        <ErrorFeedback
          error={loadError}
          operationId={OPERATION_IDS.productById}
          onRetry={fetchData}
        />
        <Link
          to={backRoute}
          aria-label='Voltar'
          title='Voltar'
          className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy hover:bg-surface-selected focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus'
        >
          <ArrowLeft aria-hidden='true' className='h-5 w-5' />
        </Link>
      </div>
    );
  }

  // Gera dados do gráfico baseados no histórico real
  const generateChartData = () => {
    if (!historicoData || !historicoData.historico.length) {
      return [];
    }

    const monthlyData: {
      [key: string]: { total: number; monthNumber: number };
    } = {};

    historicoData.historico.forEach((item) => {
      const date = new Date(item.dataSaida);
      const month = format(date, 'MMMM', { locale: ptBR });
      const monthNumber = date.getMonth();

      if (monthlyData[month]) {
        monthlyData[month].total += item.quantidadeEmprestada;
      } else {
        monthlyData[month] = {
          total: item.quantidadeEmprestada,
          monthNumber,
        };
      }
    });

    // Ordena por número do mês
    return Object.entries(monthlyData)
      .sort(([, a], [, b]) => a.monthNumber - b.monthNumber)
      .map(([month, data]) => ({
        month,
        desktop: data.total,
      }));
  };

  const chartData = generateChartData();
  const productInfo = getProductInfo(productsById, userType);
  const productInfoColumns: readonly ResponsiveColumn[] = productInfo.map(
    ({ key, title, width }) => ({
      key,
      label: title,
      weight: Math.max(Number.parseFloat(width), 1),
    })
  );

  return (
    <main className='flex min-h-screen w-full min-w-0 flex-col items-center overflow-y-auto bg-canvas pb-10 text-clt-2 md:w-[calc(100vw-var(--sidebar-width))] md:max-w-full'>
      <div className='mt-7 flex w-full max-w-6xl min-w-0 flex-wrap items-center justify-between gap-4 px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center gap-4'>
          <Link
            to={backRoute}
            aria-label='Voltar'
            className='inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-borderMy transition-colors hover:bg-surface-selected focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
          >
            <ArrowLeft className='w-5 h-5 text-clt-2' />
          </Link>
          <h1 className='font-rajdhani-medium text-2xl text-clt-2 sm:text-3xl'>
            {title}
          </h1>
        </div>
        <OpenSearch />
      </div>

      {/* Informações do Produto */}
      <section className='mt-7 w-full max-w-6xl min-w-0 px-4 sm:px-6 lg:px-8'>
        <div className='flex flex-wrap items-center justify-between gap-3 mb-4'>
          <h2 className='text-xl font-rajdhani-medium text-clt-2'>
            Informações do Produto
          </h2>
          {canEditProduct && productsById && (
            <Button
              onClick={() => setIsEditModalOpen(true)}
              variant='outline'
              size='sm'
              className='flex items-center gap-2'
            >
              <Edit className='w-4 h-4' />
              Editar Produto
            </Button>
          )}
        </div>
        <ResponsiveTable
          label='Informações do Produto'
          columns={productInfoColumns}
        >
          <HeaderTable />
          <ItemOnly data={productInfo.map((item) => item.value)} />
        </ResponsiveTable>
      </section>

      {historyError !== null && (
        <section className='mt-7 w-full max-w-6xl px-4 sm:px-6 lg:px-8'>
          <ErrorFeedback
            error={historyError}
            operationId={OPERATION_IDS.productHistory}
            onRetry={fetchData}
          />
        </section>
      )}

      {/* A API retorna somente o histórico autorizado ao perfil autenticado. */}
      {showHistoricoDetalhado && historicoData && (
        <>
          {/* Cards de Estatísticas */}
          <div className='w-11/12 min-w-0 mt-7 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Card className='min-w-0'>
              <CardHeader>
                <CardTitle className='min-w-0 wrap-break-word text-lg'>
                  Total de Empréstimos
                </CardTitle>
              </CardHeader>
              <CardContent className='min-w-0'>
                <p className='text-2xl font-bold text-primaryMy'>
                  {historicoData.totalEmprestimos}
                </p>
              </CardContent>
            </Card>

            <Card className='min-w-0'>
              <CardHeader>
                <CardTitle className='min-w-0 wrap-break-word text-lg'>
                  Quantidade Emprestada
                </CardTitle>
              </CardHeader>
              <CardContent className='min-w-0'>
                <p className='text-2xl font-bold text-primaryMy'>
                  {historicoData.totalQuantidadeEmprestada}{' '}
                  {getUnidadePlural(
                    productsById?.unidadeMedida ?? '',
                    historicoData.totalQuantidadeEmprestada
                  )}
                </p>
              </CardContent>
            </Card>

            <Card className='min-w-0'>
              <CardHeader>
                <CardTitle className='min-w-0 wrap-break-word text-lg'>
                  Status Atual
                </CardTitle>
              </CardHeader>
              <CardContent className='min-w-0'>
                <p className='text-lg font-medium text-clt-2'>
                  {productsById?.status ?? 'N/A'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico calculado sobre o mesmo recorte autorizado da consulta. */}
          <div className='w-11/12 min-w-0 mt-7'>
            <Card className='min-w-0'>
              <CardHeader>
                <CardTitle>Gráfico de Uso</CardTitle>
              </CardHeader>
              <CardContent className='min-w-0'>
                {chartData.length === 0 ? (
                  <div className='flex flex-col items-center justify-center h-40 gap-3'>
                    <div className='text-6xl text-gray-300'>📈</div>
                    <p className='text-lg text-clt-2 font-inter-regular text-center'>
                      Nenhum dado de histórico encontrado para gerar o gráfico.
                    </p>
                    <p className='text-sm text-gray-500 text-center'>
                      O gráfico será exibido quando houver dados de empréstimos
                      ao longo do tempo.
                    </p>
                  </div>
                ) : (
                  <ChartContainer config={chartConfig} className='h-80'>
                    <LineChart
                      accessibilityLayer
                      data={chartData}
                      margin={{
                        left: 12,
                        right: 12,
                      }}
                    >
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey='month'
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => value.slice(0, 3)}
                      />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Line
                        dataKey='desktop'
                        type='natural'
                        stroke='var(--color-desktop)'
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filtros do Histórico */}
          <div className='w-11/12 min-w-0 mt-7 flex flex-wrap gap-4 items-end'>
            <div className='flex-1 min-w-0'>
              <label className='block text-sm font-medium text-clt-2 mb-2'>
                Buscar
              </label>
              <SearchInput
                name='search'
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
            </div>
          </div>

          {/* Tabela de Histórico */}
          <div className='w-11/12 min-w-0 mt-7 border border-borderMy rounded-md min-h-96 p-4 flex flex-col'>
            <h3 className='text-xl font-rajdhani-medium text-clt-2 mb-4'>
              Histórico de Movimentações
            </h3>

            {filteredHistorico.length === 0 ? (
              <div className='flex flex-col items-center justify-center flex-1 gap-3 font-inter-regular text-clt-1'>
                <div className='text-6xl text-gray-300'>📊</div>
                <p className='text-lg text-center'>
                  Nenhuma movimentação encontrada.
                </p>
                <p className='text-sm text-gray-500 text-center'>
                  O histórico de empréstimos aparecerá aqui quando houver
                  movimentações.
                </p>
              </div>
            ) : (
              <>
                <ResponsiveTable
                  label='Histórico de Movimentações'
                  columns={verificationHistoryColumns}
                >
                  <HeaderTable />
                  <div className='mt-4 min-w-0'>
                    {filteredHistorico.map((item, index) => (
                      <ItemTable
                        key={item.emprestimoId}
                        data={[
                          format(new Date(item.dataSaida), 'dd/MM/yyyy', {
                            locale: ptBR,
                          }),
                          item.emprestimoId.toString(),
                          item.solicitanteNome || '—',
                          item.lote || 'Sem lote',
                          item.quantidadeEmprestada.toString(),
                          item.unidadeMedida,
                        ]}
                        rowIndex={index}
                      />
                    ))}
                  </div>
                </ResponsiveTable>
              </>
            )}
          </div>
        </>
      )}

      {/* Modal de Edição do Produto */}
      {productsById && (
        <ProductEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          product={productsById}
          onSuccess={handleProductUpdate}
        />
      )}
    </main>
  );
}

export default VerificationPage;
