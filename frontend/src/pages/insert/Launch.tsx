import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LaunchOutros from '@/components/global/forms/launch/LaunchOutros';
import LaunchQuimicos from '@/components/global/forms/launch/LaunchQuimicos';
import LaunchVidrarias from '@/components/global/forms/launch/LaunchVidrarias';

function Launch() {
  return (
    <div className='h-full w-full flex justify-start items-center flex-col overflow-y-auto bg-backgroundMy min-h-screen pb-9'>
      <div className='w-11/12 flex items-center justify-between mt-7'>
        <h1 className='uppercase font-rajdhani-medium text-3xl text-clt-2'>
          Realizar Lançamento de lotes
        </h1>
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
            <LaunchQuimicos />
          </TabsContent>
          <TabsContent
            value='vidrarias'
            className='w-full mt-10 rounded-md border border-borderMy p-4'
          >
            <LaunchVidrarias />
          </TabsContent>
          <TabsContent
            value='outros'
            className='w-full mt-10 rounded-md border border-borderMy p-4'
          >
            <LaunchOutros />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default Launch;
