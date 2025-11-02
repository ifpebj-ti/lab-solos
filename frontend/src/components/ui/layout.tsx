// // import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { SiteHeader } from './site-header';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true} className='flex w-full '>
      {/* O AppSidebar renderiza o menu lateral (ou a gaveta no mobile) */}
      <AppSidebar />

      <div className="flex flex-col w-full">
        {/* O SiteHeader renderiza o cabeçalho fixo no topo */}
        <div className='h-[40px] md:h-[60px]'>
          <SiteHeader />
        </div>

        <main className="flex-1 relative">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

