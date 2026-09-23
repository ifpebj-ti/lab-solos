import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingIcon from '../../../public/icons/LoadingIcon';
import FormQuimicos from '@/components/global/forms/create/FormQuimicos';
import FormVidrarias from '@/components/global/forms/create/FormVidraria';
import FormOutros from '@/components/global/forms/create/FormOutros';

function Index() {
  const isLoading = false;

  return (
    <>
      {isLoading ? (
        <div className='flex min-h-[50vh] w-full flex-row items-center justify-center gap-x-4 bg-canvas font-inter-medium text-clt-2'>
          <div className='animate-spin'>
            <LoadingIcon />
          </div>
          Carregando...
        </div>
      ) : (
        <main className='flex min-h-screen w-full flex-col items-center overflow-y-auto bg-canvas pb-10 text-clt-2'>
          <div className='mt-7 w-full max-w-6xl px-4 sm:px-6 lg:px-8'>
            <h1 className='font-rajdhani-medium text-2xl text-clt-2 sm:text-3xl'>
              Adicionar Bens
            </h1>
          </div>
          <div className='mt-6 w-full max-w-6xl px-4 sm:px-6 lg:px-8'>
            <Tabs defaultValue='quimicos' className='w-full'>
              <TabsList className='grid h-auto w-full grid-cols-3 gap-2 rounded-xl border border-borderMy bg-surface p-2'>
                <TabsTrigger
                  value='quimicos'
                  className='min-h-11 w-full rounded-md border border-borderMy font-inter-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                >
                  Químicos
                </TabsTrigger>
                <TabsTrigger
                  value='vidrarias'
                  className='min-h-11 w-full rounded-md border border-borderMy font-inter-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                >
                  Vidrarias
                </TabsTrigger>
                <TabsTrigger
                  value='outros'
                  className='min-h-11 w-full rounded-md border border-borderMy font-inter-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas'
                >
                  Outros
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value='quimicos'
                className='mt-4 w-full rounded-xl border border-borderMy bg-surface p-3 shadow-sm sm:mt-6 sm:p-6'
              >
                <FormQuimicos />
              </TabsContent>
              <TabsContent
                value='vidrarias'
                className='mt-4 w-full rounded-xl border border-borderMy bg-surface p-3 shadow-sm sm:mt-6 sm:p-6'
              >
                <FormVidrarias />
              </TabsContent>
              <TabsContent
                value='outros'
                className='mt-4 w-full rounded-xl border border-borderMy bg-surface p-3 shadow-sm sm:mt-6 sm:p-6'
              >
                <FormOutros />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      )}
    </>
  );
}

export default Index;
