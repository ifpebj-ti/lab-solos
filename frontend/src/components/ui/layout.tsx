import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen={true} className='flex'>
      <AppSidebar />
      <main className='flex-1 relative'>
        {/* Trigger flutuante no canto superior esquerdo do conteúdo */}
        <div className='absolute top-4 left-4 z-20'>
          <SidebarTrigger />
        </div>
        {children}
      </main>
    </SidebarProvider>
  );
}
