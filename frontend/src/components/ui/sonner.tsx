import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className='toaster group'
      theme='light'
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:border-[#D4D4D8] group-[.toaster]:bg-[#FFFFFF] group-[.toaster]:text-[#18181B] group-[.toaster]:shadow-lg [color-scheme:light]',
          description: 'group-[.toast]:text-[#3F3F46]',
          actionButton:
            'group-[.toast]:bg-[#16A34A] group-[.toast]:text-[#FFFFFF]',
          cancelButton:
            'group-[.toast]:bg-[#F4F4F5] group-[.toast]:text-[#3F3F46]',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
