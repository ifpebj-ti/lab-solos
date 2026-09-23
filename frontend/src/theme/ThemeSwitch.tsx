import { cn } from '@/lib/utils';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './themeContext';

type ThemeSwitchProps = {
  className?: string;
};

export function ThemeSwitch({ className }: ThemeSwitchProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'dark' ? 'claro' : 'escuro';

  return (
    <button
      type='button'
      data-theme-switch
      aria-label={`Mudar para tema ${nextTheme}`}
      aria-pressed={theme === 'dark'}
      onClick={toggleTheme}
      className={cn(
        'fixed right-4 top-4 z-[60] flex min-h-11 items-center justify-center gap-2 rounded-md border border-borderMy bg-surface px-3 text-sm font-inter-medium text-primaryMy shadow-sm transition-colors hover:bg-surface-selected focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun aria-hidden='true' className='h-4 w-4 shrink-0' />
      ) : (
        <Moon aria-hidden='true' className='h-4 w-4 shrink-0' />
      )}
      <span className='group-data-[collapsible=icon]:hidden'>
        Tema: {theme === 'dark' ? 'escuro' : 'claro'}
      </span>
    </button>
  );
}
