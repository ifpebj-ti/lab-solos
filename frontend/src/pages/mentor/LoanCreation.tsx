import OpenSearch from '@/components/global/OpenSearch';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { ShoppingCart, SquareX, Users } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import PopoverInput from '@/components/global/inputs/PopoverInput';
import { useEffect, useState } from 'react';
import { getAllProducts } from '@/integration/Product';
import InputText from '@/components/global/inputs/Text';
import { getDependentes } from '@/integration/Class';
import HeaderTable from '@/components/global/table/Header';
import { loanCreationHeader } from '@/mocks/Unidades';
import { createLoan } from '@/integration/Loans';
import { toast } from '@/components/hooks/use-toast';
import ItemDelete from '@/components/global/table/ItemDelete';

interface Produto {
  id: number;
  nomeProduto: string;
  tipoProduto: string;
  fornecedor: string;
  quantidade: number;
  quantidadeMinima: number;
  localizacaoProduto: string;
  dataFabricacao: string | null;
  dataValidade: string | null;
  status: string;
}

interface IUsuario {
  id: number;
  nomeCompleto: string;
  email: string;
  telefone: string;
  dataIngresso: string;
  status: string;
  nivelUsuario: string;
  cidade: string;
  curso: string;
  instituicao: string;
}

interface IProduto {
  produtoId: number | string;
  quantidade: number | string;
}

interface ICreateLoan {
  diasParaDevolucao: number | string;
  solicitanteId: number | string;
  produtos: IProduto[];
}

const selectProductSchema = z.object({
  group: z.string().nonempty('Selecione um grupo'),
  item: z.string().nonempty('Selecione um item'),
  quantity: z
    .string()
    .transform((val) => Number(val))
    .refine((val) => Number.isInteger(val) && val > 0, {
      message: 'Quantidade deve ser um número inteiro positivo.',
    }),
  user: z.string().nonempty('Selecione um usuário'),
  unidadeMedida: z.string().nonempty('Selecione uma unidade de medida'),
});

type SelectItemFormData = z.infer<typeof selectProductSchema>;

function LoanCreation() {
  const [isLoading, setIsLoading] = useState(false);
  const [group, setGroup] = useState('');
  const [item, setItem] = useState('');
  const [userSelected, setUserSelected] = useState('');
  const [products, setProducts] = useState<Produto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Produto[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<
    { produtoId: number; quantidade: number; um: string }[]
  >([]);
  const [dependentes, setDependentes] = useState<IUsuario[]>([]);
  const [unidadeMedida, setUnidadeMedida] = useState<string>('');

  const unidadesMedidaOptions = [
    { value: 'Litro', label: 'Litro' },
    { value: 'Mililitro', label: 'Mililitro' },
    { value: 'MetroCubico', label: 'Metro Cúbico' },
    { value: 'Grama', label: 'Grama' },
    { value: 'Quilograma', label: 'Quilograma' },
    { value: 'Tonelada', label: 'Tonelada' },
    { value: 'CentimetroCubico', label: 'Centímetro Cúbico' },
    { value: 'Miligrama', label: 'Miligrama' },
    { value: 'Unidade', label: 'Unidade' },
    { value: 'Metro', label: 'Metro' },
    { value: 'Centimetro', label: 'Centímetro' },
    { value: 'Milimetro', label: 'Milímetro' },
  ];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SelectItemFormData>({
    resolver: zodResolver(selectProductSchema),
  });

  useEffect(() => {
    const fetchAllProducts = async () => {
      setIsLoading(true);
      try {
        const response = await getAllProducts();
        const responseDependentes = await getDependentes();
        const habilitados = responseDependentes.filter(
          (user: { status: string }) => user.status === 'Habilitado'
        );
        setDependentes(habilitados);
        setProducts(response);
        setFilteredProducts(response); // Inicialmente, todos os produtos são exibidos
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('Erro ao buscar dados de empréstimos:', error);
        }
        setProducts([]);
        setDependentes([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  useEffect(() => {
    if (group) {
      const filtered = products.filter(
        (produto) => produto.tipoProduto === group
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [group, products]);

  const handleAddProduct = (data: SelectItemFormData) => {
    const selectedProduct = products.find(
      (produto) => produto.id === Number(data.item)
    );
    if (selectedProduct) {
      setSelectedProducts((prev) => [
        ...prev,
        {
          produtoId: selectedProduct.id,
          quantidade: data.quantity,
          um: unidadeMedida,
        },
      ]);
    }

    // 🔹 Resetando os campos
    setGroup('');
    setItem('');
    setValue('group', ''); // Reseta o campo "Grupo"
    setValue('item', ''); // Reseta o campo "Item"
    setValue('quantity', 0); // Reseta o campo "Quantidade"
    setValue('unidadeMedida', ''); // Reseta o campo "Unidade de Medida"
    setUnidadeMedida('');
  };

  const handleSubmitLoan = async () => {
    if (!userSelected || selectedProducts.length === 0) {
      return;
    }

    const loanData: ICreateLoan = {
      diasParaDevolucao: 5,
      solicitanteId: Number(userSelected),
      produtos: selectedProducts.map((produto) => ({
        produtoId: produto.produtoId,
        quantidade: produto.quantidade,
      })),
    };

    try {
      setIsLoading(true);
      await createLoan(loanData);
      toast({
        title: 'Solicitação de empréstimo bem sucessida!',
        description: 'Redirecionando...',
      });
      setUserSelected('');
      setSelectedProducts([]);
    } catch {
      toast({
        title: 'Erro na criação do empréstimo',
        description:
          'Verifique disponibilidade dos produtos selecionados e tente novamente...',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unidadesTypes = [
    { value: 'Quimico', label: 'Químico' },
    { value: 'Vidraria', label: 'Vidraria' },
    { value: 'Outro', label: 'Outro' },
  ];

  const getProductNameById = (id: number): string => {
    const produto = products.find((product) => product.id === id);
    return produto ? produto.nomeProduto : 'Produto não encontrado';
  };

  return (
    <>
      {isLoading ? (
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
              Criação de Empréstimo
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-h-32 mt-7 rounded-md border border-borderMy flex flex-col shadow-sm'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Utilizadores
              </p>
              <div className='relative'>
                <Users size={25} stroke='#474747' strokeWidth={1.75} />
              </div>
            </div>
            <form
              onSubmit={handleSubmit(handleAddProduct)}
              className='flex flex-col items-center justify-center w-full'
            >
              <div className='flex items-center justify-between gap-x-5 w-full px-4 mb-5'>
                <PopoverInput
                  title='Usuário'
                  unidades={dependentes.map((dependente) => ({
                    value: String(dependente.id),
                    label: dependente.nomeCompleto,
                  }))}
                  value={userSelected}
                  onChange={(value) => {
                    setUserSelected(value);
                    setValue('user', value);
                  }}
                  error={errors.user?.message}
                />
              </div>
            </form>
          </div>
          <div className='w-11/12 min-h-32 mt-9 rounded-md border border-borderMy flex flex-col shadow-sm'>
            <div className='w-full rounded-t-md border-b border-b-borderMy flex items-center justify-between p-4'>
              <p className='font-rajdhani-medium text-clt-2 text-xl'>
                Produtos
              </p>
              <div className='relative'>
                <ShoppingCart size={25} stroke='#474747' strokeWidth={1.75} />
              </div>
            </div>
            <form
              onSubmit={handleSubmit(handleAddProduct)}
              className='flex flex-col items-center justify-center w-full'
            >
              <div className='flex items-center justify-between gap-x-5 w-full px-4'>
                <PopoverInput
                  title='Grupo'
                  unidades={unidadesTypes}
                  value={group}
                  onChange={(value) => {
                    setGroup(value);
                    setValue('group', value);
                  }}
                  error={errors.group?.message}
                />
                <PopoverInput
                  title='Item'
                  unidades={filteredProducts.map((produto) => ({
                    value: String(produto.id),
                    label: produto.nomeProduto,
                  }))}
                  value={item}
                  onChange={(value) => {
                    setItem(value);
                    setValue('item', value);
                  }}
                  error={errors.item?.message}
                />
              </div>
              <div className='flex items-center justify-center gap-x-5 w-full px-4 mb-5'>
                <div className='w-1/2'>
                  <InputText
                    label={'Quantidade'}
                    type={'number'}
                    register={register}
                    name={'quantity'}
                    error={errors.quantity?.message}
                  />
                </div>
                <div className='w-1/2 flex gap-x-5'>
                  <div className='w-1/2'>
                    <PopoverInput
                      title='Unidade de Medida'
                      unidades={unidadesMedidaOptions}
                      value={unidadeMedida}
                      onChange={(value) => {
                        setUnidadeMedida(value);
                        setValue('unidadeMedida', value);
                      }}
                      error={errors.unidadeMedida?.message}
                    />
                  </div>
                  <button
                    type='submit'
                    className='font-rajdhani-semibold text-white text-base bg-primaryMy h-9 mt-9 w-1/2  rounded-sm hover:bg-opacity-90 transition-all ease-in-out duration-150'
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </form>
            <div className='w-full border-t border-borderMy pb-4 px-4 pt-2 rounded-b-md flex flex-col items-center justify-center'>
              <div className='flex flex-col items-center justify-center w-full'>
                <HeaderTable columns={loanCreationHeader} />
                <div className='w-full items-center flex flex-col min-h-14'>
                  {selectedProducts.length === 0 ? (
                    <div className='w-full h-24 flex items-center justify-center font-inter-regular'>
                      Nenhum dado disponível para exibição.
                    </div>
                  ) : (
                    selectedProducts.map((rowData, index) => (
                      <ItemDelete
                        key={index}
                        data={[
                          String(rowData.produtoId),
                          getProductNameById(rowData.produtoId),
                          String(rowData.quantidade + ' ' + rowData.um),
                        ]}
                        rowIndex={index}
                        columnWidths={loanCreationHeader.map(
                          (column) => column.width
                        )}
                        icon1={
                          <SquareX width={20} height={20} stroke='#dd1313' />
                        }
                        onClick={() => {
                          setSelectedProducts((prev) =>
                            prev.filter(
                              (p) => p.produtoId !== rowData.produtoId
                            )
                          );
                        }}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className='w-11/12 mt-9 flex items-center justify-end'>
            <button
              onClick={handleSubmitLoan}
              disabled={selectedProducts.length === 0 || !userSelected}
              className='font-rajdhani-semibold text-white text-base bg-primaryMy h-10 w-96 rounded-sm hover:bg-opacity-90 flex items-center justify-center transition-all ease-in-out duration-150'
            >
              Solicitar Empréstimo
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default LoanCreation;
