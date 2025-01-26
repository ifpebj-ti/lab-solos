import { useUser } from '@/components/context/UserProvider';
import LoadingIcon from '../../public/icons/LoadingIcon';
import OpenSearch from '@/components/global/OpenSearch';
import { useEffect, useState } from 'react';
import FollowUpCard from '@/components/screens/FollowUp';
import LayersIcon from '../../public/icons/LayersIcon';
import InfoContainer from '@/components/screens/InfoContainer';
import { Link } from 'react-router-dom';
import { getUserById } from '@/integration/Users';
import Cookie from 'js-cookie';

interface IUsuario {
  instituicao: string;
  cidade: string;
  curso: string;
  id: number;
  nomeCompleto: string;
  email: string;
  senhaHash: string;
  telefone: string;
  dataIngresso: string;
  nivelUsuario: number;
  tipoUsuario: number;
  status: number;
  emprestimosSolicitados: null;
  emprestimosAprovados: null;
}

function Profile() {
  const { rankID } = useUser();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<IUsuario>();
  const id = Cookie.get('rankID')!;

  useEffect(() => {
    const fetchGetUserById = async () => {
      try {
        const response = await getUserById({ id });
        setUser(response);
      } catch (error) {
        console.error('Erro ao buscar usuários', error);
        setUser(undefined);
      } finally {
        setLoading(false);
      }
    };
    fetchGetUserById();
  }, [id]);

  console.log(user);

  if (rankID === null) {
    return (
      <div className='flex justify-center flex-row w-full h-screen items-center gap-x-4 font-inter-medium text-clt-2 bg-backgroundMy'>
        <div className='animate-spin'>
          <LoadingIcon />
        </div>
        Carregando informações do perfil...
      </div>
    );
  }
  const infoItems = [
    {
      title: 'Nome',
      value: 'Maria Leony Silva',
      width: '50%',
    },
    {
      title: 'Email',
      value: 'mls@ufcg.discente.edu.br',
      width: '30%',
    },
    { title: 'Instituição', value: 'UFCG', width: '20%' },
  ];
  const infoItems2 = [{ title: 'Cidade', value: 'Patos - PB', width: '100%' }];
  const infoItems3 = [
    {
      title: 'Telefone',
      value: '(85) 98126-8744',
      width: '100%',
    },
  ];
  const infoItems4 = [
    {
      title: 'Status',
      value: 'Liberado',
      width: '100%',
    },
  ];
  const infoItems5 = [
    { title: 'Curso', value: 'Med. Veterinária', width: '100%' },
  ];

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
        <div className='w-full flex min-h-screen justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Perfil
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              {String(rankID) === '2' && (
                <Link to={'/me/myclass'} className='border border-borderMy rounded-md h-11 px-7 flex items-center justify-center hover:bg-cl-table-item transition-all ease-in-out duration-200 font-inter-regular'>Minha Turma</Link>
              )}
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 mt-7'>
            <div className='flex gap-x-5 h-32'>
              <FollowUpCard
                title='Empréstimos Realizados'
                number='22'
                icon={<LayersIcon />}
              />
              <FollowUpCard
                title='Itens Utilizados'
                number='59'
                icon={<LayersIcon />}
              />
            </div>
            <div className='w-full mt-7'>
              <InfoContainer items={infoItems} />
              <div className='w-full flex gap-x-8 mt-5'>
                <InfoContainer items={infoItems2} />
                <InfoContainer items={infoItems3} />
                <InfoContainer items={infoItems4} />
                <InfoContainer items={infoItems5} />
              </div>
              {String(rankID) === '3' && (
                <div className='w-full mt-5'>
                  <InfoContainer items={infoItems} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Profile;
