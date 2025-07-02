import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { columnsVer, getUnidadePlural } from '@/mocks/Unidades';
import SelectInput from '@/components/global/inputs/SelectInput';
import SearchInput from '@/components/global/inputs/SearchInput';
import InfoContainer from '@/components/screens/InfoContainer';
import HeaderTable from '@/components/global/table/Header';
import LoadingIcon from '@/components/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import ItemTable from '@/components/global/table/Item';
import ProductEditModal from '@/components/modals/ProductEditModal';
import { Button } from '@/components/ui/button';
import {
  getProductById,
  getProductHistoricoSaida,
} from '@/integration/Product';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';

// Interfaces
interface UsuarioEmprestimo {
  id: number;
  nome: string;
  email: string;
  instituicao: string | null;
}

interface HistoricoSaidaItem {
  emprestimoId: number;
  dataEmprestimo: string;
  dataDevolucao: string | null;
  quantidadeEmprestada: number;
  statusEmprestimo: string;
  solicitante: UsuarioEmprestimo;
  aprovador: UsuarioEmprestimo | null;
  identificador: string;
  lote: string | null;
}

interface HistoricoSaidaProdutoResponse {
  produtoId: number;
  nomeProduto: string;
  tipoProduto: string;
  estoqueAtual: number;
  unidadeMedida: string;
  historico: HistoricoSaidaItem[];
  totalEmprestimos: number;
  totalQuantidadeEmprestada: number;
}

interface IProduto {
  catmat: string;
  unidadeMedida: string;
  estadoFisico: number;
  cor: number;
  odor: number;
  densidade: number;
  pesoMolecular: number;
  grauPureza: string;
  formulaQuimica: string;
  grupo: number;
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
  altura: string;
  formato: string;
  graduada: string;
  material: string;
}

// Tipos de usuário
type UserType = 'admin' | 'mentor' | 'mentee';

interface VerificationProps {
  userType: UserType;
}

// Configuração do gráfico
const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
} satisfies ChartConfig;

function VerificationPage({ userType }: VerificationProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [value, setValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [productsById, setProductsById] = useState<IProduto>();
  const [historicoData, setHistoricoData] =
    useState<HistoricoSaidaProdutoResponse | null>(null);
  const [filteredHistorico, setFilteredHistorico] = useState<
    HistoricoSaidaItem[]
  >([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const location = useLocation();
  const id = location.state?.id;

  // Configurações específicas por tipo de usuário
  const getBackRoute = () => {
    switch (userType) {
      case 'admin':
        return '/admin/search-material';
      case 'mentor':
        return '/mentor/search-material';
      case 'mentee':
        return '/mentee/search-material';
      default:
        return '/';
    }
  };

  const getPageTitle = () => {
    switch (userType) {
      case 'admin':
        return 'Verificação - Administrador';
      case 'mentor':
        return 'Verificação - Mentor';
      case 'mentee':
        return 'Verificação - Mentorado';
      default:
        return 'Verificação';
    }
  };

  // Determina se deve mostrar o histórico detalhado (apenas admin)
  const showHistoricoDetalhado = userType === 'admin';

  // Determina se deve buscar histórico para gráfico (apenas admin)
  const needsHistoricoForChart = userType === 'admin';

  // Determina quais informações do produto mostrar baseado no tipo de usuário
  const getProductInfo = () => {
    if (!productsById) return [];

    // Verifica se deve mostrar fórmula (apenas para produtos químicos com valor)
    const shouldShowFormula =
      productsById.tipoProduto === 'Quimico' &&
      productsById.formulaQuimica &&
      productsById.formulaQuimica.trim() !== '';

    switch (userType) {
      case 'admin': {
        // Admin vê todas as informações
        const adminInfo = [
          {
            title: 'Item',
            value: productsById.nomeProduto,
            width: shouldShowFormula ? '25%' : '30%',
          },
        ];

        if (shouldShowFormula) {
          adminInfo.push({
            title: 'Fórmula',
            value: productsById.formulaQuimica,
            width: '20%',
          });
        }

        adminInfo.push(
          {
            title: 'Fornecedor',
            value: productsById.fornecedor,
            width: shouldShowFormula ? '20%' : '25%',
          },
          {
            title: 'Grupo',
            value: productsById.grupo?.toString() || 'N/A',
            width: '15%',
          },
          {
            title: 'Situação',
            value: productsById.status?.toString() || 'N/A',
            width: shouldShowFormula ? '20%' : '30%',
          }
        );

        return adminInfo;
      }

      case 'mentor': {
        // Mentor vê informações básicas (sem fornecedor)
        const mentorInfo = [
          {
            title: 'Item',
            value: productsById.nomeProduto,
            width: shouldShowFormula ? '30%' : '40%',
          },
        ];

        if (shouldShowFormula) {
          mentorInfo.push({
            title: 'Fórmula',
            value: productsById.formulaQuimica,
            width: '25%',
          });
        }

        mentorInfo.push(
          {
            title: 'Grupo',
            value: productsById.grupo?.toString() || 'N/A',
            width: shouldShowFormula ? '25%' : '30%',
          },
          {
            title: 'Situação',
            value: productsById.status?.toString() || 'N/A',
            width: shouldShowFormula ? '20%' : '30%',
          }
        );

        return mentorInfo;
      }

      case 'mentee': {
        // Mentee vê apenas informações essenciais
        const menteeInfo = [
          {
            title: 'Item',
            value: productsById.nomeProduto,
            width: shouldShowFormula ? '40%' : '50%',
          },
        ];

        if (shouldShowFormula) {
          menteeInfo.push({
            title: 'Fórmula',
            value: productsById.formulaQuimica,
            width: '30%',
          });
        }

        menteeInfo.push({
          title: 'Grupo',
          value: productsById.grupo?.toString() || 'N/A',
          width: shouldShowFormula ? '30%' : '50%',
        });

        return menteeInfo;
      }

      default:
        return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const productResponse = await getProductById({ id });
        setProductsById(productResponse);

        // Busca histórico para admin (tabela detalhada e gráfico)
        if (showHistoricoDetalhado || needsHistoricoForChart) {
          const historicoResponse = await getProductHistoricoSaida({ id });
          setHistoricoData(historicoResponse);
          setFilteredHistorico(historicoResponse.historico);
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados', error);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, showHistoricoDetalhado, needsHistoricoForChart]);

  // Filtros para histórico
  useEffect(() => {
    if (!historicoData) return;

    let filtered = historicoData.historico;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.solicitante.nome
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.solicitante.email
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          item.identificador.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (value && value !== 'all') {
      filtered = filtered.filter((item) => item.statusEmprestimo === value);
    }

    setFilteredHistorico(filtered);
  }, [searchTerm, value, historicoData]);

  // Função para recarregar dados do produto após edição
  const handleProductUpdate = async () => {
    if (id) {
      try {
        const productResponse = await getProductById({ id });
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
      <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando...
      </div>
    );
  }

  if (!productsById) {
    return (
      <div className='flex justify-center items-center h-screen bg-backgroundMy'>
        <p className='text-clt-2 font-inter-medium'>Produto não encontrado.</p>
      </div>
    );
  }

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'Emprestado', label: 'Emprestado' },
    { value: 'Devolvido', label: 'Devolvido' },
    { value: 'Atrasado', label: 'Atrasado' },
    { value: 'Perdido', label: 'Perdido' },
  ];

  // Gera dados do gráfico baseados no histórico real
  const generateChartData = () => {
    if (!historicoData || !historicoData.historico.length) {
      return [];
    }

    const monthlyData: {
      [key: string]: { total: number; monthNumber: number };
    } = {};

    historicoData.historico.forEach((item) => {
      const date = new Date(item.dataEmprestimo);
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

  return (
    <div className='w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy min-h-screen pb-9'>
      <div className='w-11/12 flex items-center justify-between mt-7'>
        <div className='flex items-center gap-4'>
          <Link
            to={getBackRoute()}
            className='flex items-center justify-center w-10 h-10 rounded-md border border-borderMy hover:bg-cl-table-item transition-colors'
          >
            <ArrowLeft className='w-5 h-5 text-clt-2' />
          </Link>
          <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
            {getPageTitle()}
          </h1>
        </div>
        <OpenSearch />
      </div>

      {/* Informações do Produto */}
      <div className='w-11/12 mt-7'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-xl font-rajdhani-medium text-clt-2'>
            Informações do Produto
          </h2>
          {showHistoricoDetalhado && productsById && (
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
        <InfoContainer items={getProductInfo()} />
      </div>

      {/* Seção de Histórico - apenas para admin */}
      {showHistoricoDetalhado && historicoData && (
        <>
          {/* Cards de Estatísticas */}
          <div className='w-11/12 mt-7 grid grid-cols-1 md:grid-cols-3 gap-4'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Total de Empréstimos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-bold text-primaryMy'>
                  {historicoData.totalEmprestimos}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Quantidade Emprestada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-bold text-primaryMy'>
                  {historicoData.totalQuantidadeEmprestada}{' '}
                  {getUnidadePlural(
                    productsById.unidadeMedida,
                    historicoData.totalQuantidadeEmprestada
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>Status Atual</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-lg font-medium text-clt-2'>
                  {productsById.status}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Uso - apenas para admin */}
          <div className='w-11/12 mt-7'>
            <Card>
              <CardHeader>
                <CardTitle>Gráfico de Uso</CardTitle>
              </CardHeader>
              <CardContent>
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
          <div className='w-11/12 mt-7 flex gap-4 items-end'>
            <div className='flex-1'>
              <label className='block text-sm font-medium text-clt-2 mb-2'>
                Buscar
              </label>
              <SearchInput
                name='search'
                onChange={(e) => setSearchTerm(e.target.value)}
                value={searchTerm}
              />
            </div>
            <div className='w-48'>
              <label className='block text-sm font-medium text-clt-2 mb-2'>
                Status
              </label>
              <SelectInput
                options={statusOptions}
                onValueChange={setValue}
                value={value}
              />
            </div>
          </div>

          {/* Tabela de Histórico */}
          <div className='w-11/12 mt-7 border border-borderMy rounded-md min-h-96 p-4 flex flex-col'>
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
                <HeaderTable columns={columnsVer} />
                <div className='mt-4'>
                  {filteredHistorico.map((item, index) => (
                    <ItemTable
                      key={index}
                      data={[
                        format(new Date(item.dataEmprestimo), 'dd/MM/yyyy', {
                          locale: ptBR,
                        }),
                        item.solicitante.nome,
                        item.identificador,
                        item.lote || 'N/A',
                        item.quantidadeEmprestada.toString(),
                        historicoData?.unidadeMedida
                          ? historicoData.unidadeMedida
                          : 'N/A',
                      ]}
                      rowIndex={index}
                      columnWidths={columnsVer.map((col) => col.width)}
                    />
                  ))}
                </div>
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
    </div>
  );
}

export default VerificationPage;
