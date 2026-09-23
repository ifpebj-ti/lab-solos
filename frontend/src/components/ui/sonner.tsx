import { Toaster as Sonner } from 'sonner';
import { useTheme } from '@/theme/themeContext';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      className='toaster group'
      theme={theme}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:border-borderMy group-[.toaster]:bg-surface group-[.toaster]:text-clt-2 group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-clt-1',
          actionButton:
            'group-[.toast]:bg-primaryMy group-[.toast]:text-[rgb(var(--color-action-foreground))]',
          cancelButton:
            'group-[.toast]:bg-surface-muted group-[.toast]:text-clt-2',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
