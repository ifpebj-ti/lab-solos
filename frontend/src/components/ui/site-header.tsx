import { Menu } from 'lucide-react'; // Importamos o ícone de hambúrguer corretamente
import { Button } from '@/components/ui/button';
import { useSidebar } from '@/components/ui/sidebar';

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();

  return (
    <header className='flex sticky top-0 z-50 w-full h-full items-center border-b bg-background px-4'>
      {/* Botão Hambúrguer para o MOBILE */}
      <Button
        className='h-8 w-8'
        variant='ghost'
        size='icon'
        onClick={toggleSidebar}
      >
        <Menu className='h-5 w-5' /> {/* Usamos o ícone 'Menu' */}
        <span className='sr-only'>Abrir/Fechar Menu</span>
      </Button>

      {/* Você pode adicionar outros elementos do header aqui, como o título da página */}
      {/* <div className="flex-1">
            </div> */}
    </header>
  );
}
