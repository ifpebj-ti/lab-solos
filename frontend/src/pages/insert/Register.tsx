import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import { Link } from 'react-router-dom';
import OpenSearch from '@/components/global/OpenSearch';
import FormQuimicos from '@/components/global/forms/create/FormQuimicos';
import FormVidrarias from '@/components/global/forms/create/FormVidraria';
import FormOutros from '@/components/global/forms/create/FormOutros';

function Index() {
  const isLoading = false;

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
        <div className='h-full w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy'>
          <div className='w-11/12 flex items-center justify-between mt-7'>
            <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
              Cadastro de Bens
            </h1>
            <div className='flex items-center justify-between gap-x-6'>
              <Link
                to={'/admin/insert/launch'}
                className='border border-borderMy rounded-md h-11 px-4 uppercase font-inter-medium text-clt-2 text-sm hover:bg-cl-table-item transition-all ease-in-out duration-200 flex items-center'
              >
                Realizar Lançamento
              </Link>
              <OpenSearch />
            </div>
          </div>
          <div className='w-11/12 min-h-96 mt-6'>
            <Tabs defaultValue='quimicos' className='w-full'>
              <TabsList className='w-full flex items-center justify-between h-[52px] border border-borderMy rounded-md px-2'>
                <TabsTrigger
                  value='quimicos'
                  className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
                >
                  Químicos
                </TabsTrigger>
                <TabsTrigger
                  value='vidrarias'
                  className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
                >
                  Vidrarias
                </TabsTrigger>
                <TabsTrigger
                  value='outros'
                  className='font-inter-medium rounded-sm border border-borderMy w-[30%] h-9'
                >
                  Outros
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value='quimicos'
                className='w-full mt-10 rounded-md border border-borderMy p-4'
              >
                <FormQuimicos />
              </TabsContent>
              <TabsContent
                value='vidrarias'
                className='w-full mt-10 rounded-md border border-borderMy p-4'
              >
                <FormVidrarias />
              </TabsContent>
              <TabsContent
                value='outros'
                className='w-full mt-10 rounded-md border border-borderMy p-4'
              >
                <FormOutros />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      )}
    </>
  );
}

export default Index;
