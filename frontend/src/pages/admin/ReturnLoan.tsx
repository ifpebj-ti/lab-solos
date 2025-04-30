import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { returnLoanCol, returnLoanColTx } from '@/mocks/Unidades';
import HeaderTable from '@/components/global/table/Header';
import { useEffect, useState } from 'react';
import InfoContainer from '@/components/screens/InfoContainer';
import { formatDate } from '@/function/date';
import { getLoansById } from '@/integration/Loans';
import { useLocation } from 'react-router-dom';
import ItemReturn from '@/components/global/table/ItemReturn';
import ItemTable from '@/components/global/table/Item';

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

export interface IUsuario {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string;
  status: string;
  nivelUsuario: string;
  tipoUsuario: string;
  instituicao?: string;
  cidade?: string;
  curso?: string;
  responsavel: IUsuario | null;
}

export interface IEmprestimo {
  id: number;
  dataRealizacao: string;
  dataDevolucao: string;
  dataAprovacao: string | null;
  status: string;
  produtos: IEmprestimoProduto[];
  solicitante: IUsuario;
  aprovador: IUsuario | null;
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
        <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy pb-9'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Devolução de Empréstimo
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <InfoContainer items={infoItems} />
            <div className='w-full flex gap-x-8 mt-5'>
              <InfoContainer items={infoItems3} />
              <InfoContainer items={infoItems4} />
            </div>
          </div>
          {produtosQuimicos.length > 0 && (
            <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Químicos
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full px-4'>
                <HeaderTable columns={returnLoanColTx} />
                <div className='w-full items-center flex flex-col min-h-14'>
                  {produtosQuimicos.map((row, rowIndex) => (
                    <ItemTable
                      data={[
                        row.produto.nomeProduto,
                        row.produto.quantidade.toString(),
                        row.produto.unidadeMedida,
                        row.produto.lote.codigoLote,
                      ]}
                      rowIndex={rowIndex}
                      columnWidths={returnLoanColTx.map(
                        (column) => column.width
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {produtosVidraria.length > 0 && (
            <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Vidrarias
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full px-4'>
                <HeaderTable columns={returnLoanCol} />
                <div className='w-full items-center flex flex-col min-h-14'>
                  {produtosVidraria.map((row, rowIndex) => (
                    <ItemReturn
                      data={[
                        row.produto.nomeProduto,
                        row.produto.quantidade.toString(),
                      ]}
                      rowIndex={rowIndex}
                      columnWidths={returnLoanCol.map((column) => column.width)}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {produtosOutros.length > 0 && (
            <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col'>
              <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
                <p className='font-rajdhani-medium text-clt-2 text-xl'>
                  Outros
                </p>
              </div>
              <div className='flex flex-col items-center justify-center w-full px-4'>
                <HeaderTable columns={returnLoanColTx} />
                <div className='w-full items-center flex flex-col min-h-14'>
                  {produtosOutros.map((row, rowIndex) => (
                    <ItemReturn
                      data={[
                        row.produto.nomeProduto,
                        row.produto.quantidade.toString(),
                        row.produto.unidadeMedida,
                        row.produto.lote.codigoLote,
                      ]}
                      rowIndex={rowIndex}
                      columnWidths={returnLoanColTx.map(
                        (column) => column.width
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default ReturnLoan;
