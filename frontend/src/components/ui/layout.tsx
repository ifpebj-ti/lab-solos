import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';
import { SiteHeader } from './site-header';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen className='flex w-full'>
      <a
        href='#main-content'
        className='sr-only z-[100] rounded-md bg-surface px-3 py-2 text-clt-2 focus:not-sr-only focus:fixed focus:left-3 focus:top-3'
      >
        Ir para o conteúdo
      </a>
      <AppSidebar />

      <div className='flex w-full min-w-0 flex-col'>
        <div className='h-[40px] md:h-[60px]'>
          <SiteHeader />
        </div>

        <main id='main-content' className='relative min-h-0 flex-1' tabIndex={-1}>
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
