import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import HeaderTable from '@/components/global/table/Header';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { formatDate } from '@/function/date';
import { getLoansById, returnLoan } from '@/integration/Loans';
import { useLocation } from 'react-router-dom';
import ItemReturn from '@/components/global/table/ItemReturn';
import ItemTable from '@/components/global/table/Item';
import {
  ResponsiveTable,
  type ResponsiveColumn,
} from '@/components/global/table/ResponsiveTable';
import { toast } from '@/components/hooks/use-toast';
import { RefreshCw } from 'lucide-react';
import type { Usuario } from '@/contracts/user';

const readOnlyColumns: readonly ResponsiveColumn[] = [
  { key: 'item', label: 'Item', weight: 4 },
  { key: 'quantity', label: 'Quantidade', weight: 2 },
  { key: 'unit', label: 'Unidade de Medida', weight: 2 },
  { key: 'batch', label: 'Lote ID', weight: 2 },
];

const glasswareColumns: readonly ResponsiveColumn[] = [
  { key: 'item', label: 'Item', weight: 4 },
  { key: 'quantity', label: 'Quantidade', weight: 2 },
  { key: 'return', label: 'Devolução', weight: 2 },
  { key: 'reason', label: 'Justificativa', weight: 4 },
];

const otherReturnColumns: readonly ResponsiveColumn[] = [
  ...readOnlyColumns,
  { key: 'return', label: 'Devolução', weight: 2 },
  { key: 'reason', label: 'Justificativa', weight: 4 },
];

export interface ILote {
  codigoLote: string;
  fornecedor: string;
  dataFabricacao: string;
  dataValidade: string;
  dataEntrada: string;
  produtos: IProduto[]; // Normalmente vazio na resposta
}

export interface IProduto {
  id: number;
  catmat: string;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string;
  unidadeMedida: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string;
  dataValidade: string;
  status: string;
  lote: ILote;
}

export interface IEmprestimoProduto {
  emprestimoId: number;
  produto: IProduto;
  quantidade: number;
}

export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  produtos: IEmprestimoProduto[];
  solicitante: Usuario;
  aprovador: Usuario | null;
}

function ReturnLoan() {
  const [loading, setLoading] = useState(true);
  const [loans, setLoans] = useState<IEmprestimo>();
  const location = useLocation();
  const id = location.state?.id; // Recupera o ID passado via state

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const loansResponse = await getLoansById({ id });
        setLoans(loansResponse);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados usuários', error);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchGetUserById();
  }, [id]);

  const handleReturn = async () => {
    if (!loans?.id) return;

    try {
      await returnLoan(loans.id);
      toast({
        title: 'Devolução registrada',
        description: 'A devolução do empréstimo foi registrada com sucesso!',
      });
      // Recarregar os dados do empréstimo
      const loansResponse = await getLoansById({ id });
      setLoans(loansResponse);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Erro ao registrar devolução:', error);
      }
      toast({
        title: 'Erro durante devolução',
        description: 'Tente novamente mais tarde...',
      });
    }
  };

  const infoItems = loans
    ? [
        {
          title: 'Nome',
          value: loans.solicitante.nomeCompleto,
          width: '40%',
        },
        {
          title: 'Email',
          value: loans.solicitante.email,
          width: '30%',
        },
        { title: 'Telefone', value: loans.solicitante.telefone, width: '30%' },
      ]
    : [];
  const infoItems3 = loans
    ? [
        {
          title: 'Responsável',
          value:
            loans.solicitante.responsavel?.nomeCompleto ?? 'Não Corresponde',
          width: '100%',
        },
      ]
    : [];
  const infoItems4 = loans
    ? [
        {
          title: 'Data de Realização',
          value: formatDate(loans?.dataRealizacao),
          width: '100%',
        },
      ]
    : [];

  const produtosQuimicos =
    loans?.produtos.filter((p) => p.produto.tipoProduto === 'Quimico') || [];

  const produtosVidraria =
    loans?.produtos.filter((p) => p.produto.tipoProduto === 'Vidraria') || [];

  const produtosOutros =
    loans?.produtos.filter(
      (p) => !['Quimico', 'Vidraria'].includes(p.produto.tipoProduto)
    ) || [];

  return (
    <>
      {loading ? (
        <div
          role='status'
          className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'
        >
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 min-w-0 flex flex-wrap items-center justify-between gap-4 mt-7'>
            <h1 className='min-w-0 break-words uppercase font-rajdhani-medium text-2xl lg:text-3xl text-clt-2'>
              Devolução de Empréstimo
            </h1>
            <div className='flex min-w-0 flex-wrap items-center justify-between gap-4'>
              {loans?.status === 'Aprovado' && !loans?.dataDevolucao && (
                <button
                  type='button'
                  onClick={handleReturn}
                  className='font-rajdhani-semibold text-white bg-green-600 text-base h-10 px-4 rounded-md hover:bg-green-700 flex gap-x-2 items-center justify-center transition-all ease-in-out duration-150'
                >
                  <RefreshCw width={18} />
                  Registrar Devolução
                </button>
              )}
              {loans?.status === 'Aprovado' && loans?.dataDevolucao && (
                <div className='flex items-center gap-x-2 text-green-600 font-rajdhani-semibold'>
                  <RefreshCw width={18} />
                  Devolvido
                </div>
              )}
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-w-0 mt-7'>
            <InfoContainer items={infoItems} />
            <div className='w-full min-w-0 flex flex-col md:flex-row gap-5 mt-5'>
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
            </div>
          </div>
          {produtosQuimicos.length > 0 && (
            <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Químicos
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
                <ResponsiveTable label='Químicos' columns={readOnlyColumns}>
                  <HeaderTable />
                  <div className='w-full items-center flex flex-col min-h-14'>
                    {produtosQuimicos.map((row, rowIndex) => (
                      <ItemTable
                        key={`${row.emprestimoId}-${row.produto.id}`}
                        data={[
                          row.produto.nomeProduto,
                          row.produto.quantidade.toString(),
                          row.produto.unidadeMedida,
                          row.produto.lote.codigoLote,
                        ]}
                        rowIndex={rowIndex}
                      />
                    ))}
                  </div>
                </ResponsiveTable>
              </div>
            </div>
          )}
          {produtosVidraria.length > 0 && (
            <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Vidrarias
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
                <ResponsiveTable label='Vidrarias' columns={glasswareColumns}>
                  <HeaderTable />
                  <div className='w-full items-center flex flex-col min-h-14'>
                    {produtosVidraria.map((row, rowIndex) => (
                      <ItemReturn
                        key={`${row.emprestimoId}-${row.produto.id}`}
                        data={[
                          row.produto.nomeProduto,
                          row.produto.quantidade.toString(),
                        ]}
                        rowIndex={rowIndex}
                        rowId={`${row.emprestimoId}-${row.produto.id}`}
                      />
                    ))}
                  </div>
                </ResponsiveTable>
              </div>
            </div>
          )}
          {produtosOutros.length > 0 && (
            <div className='w-11/12 min-w-0 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Outros
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full min-w-0 px-4'>
                <ResponsiveTable label='Outros' columns={otherReturnColumns}>
                  <HeaderTable />
                  <div className='w-full items-center flex flex-col min-h-14'>
                    {produtosOutros.map((row, rowIndex) => (
                      <ItemReturn
                        key={`${row.emprestimoId}-${row.produto.id}`}
                        data={[
                          row.produto.nomeProduto,
                          row.produto.quantidade.toString(),
                          row.produto.unidadeMedida,
                          row.produto.lote.codigoLote,
                        ]}
                        rowIndex={rowIndex}
                        rowId={`${row.emprestimoId}-${row.produto.id}`}
                      />
                    ))}
                  </div>
                </ResponsiveTable>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ReturnLoan;
