// src/components/ui/button-variants.ts
import { cva } from 'class-variance-authority';

export const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-inter-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 md:min-h-9',
  {
    variants: {
      variant: {
        default:
          'bg-primaryMy text-[rgb(var(--color-action-foreground))] shadow-sm hover:bg-primaryMy/90',
        destructive:
          'bg-danger text-[rgb(var(--color-action-foreground))] shadow-sm hover:bg-danger/90',
        outline:
          'border border-borderMy bg-surface text-clt-2 shadow-sm hover:bg-surface-selected',
        secondary:
          'bg-surface-muted text-clt-2 shadow-sm hover:bg-surface-selected',
        ghost: 'text-clt-2 hover:bg-surface-selected',
        link: 'text-primaryMy underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-10 rounded-md px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type ButtonVariants = typeof buttonVariants;
