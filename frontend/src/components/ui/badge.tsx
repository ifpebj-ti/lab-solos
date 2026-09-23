import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-inter-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-focus focus:ring-offset-2 focus:ring-offset-canvas',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primaryMy text-[rgb(var(--color-action-foreground))] hover:bg-primaryMy/90',
        secondary:
          'border-transparent bg-surface-muted text-clt-2 hover:bg-surface-selected',
        destructive:
          'border-transparent bg-danger text-[rgb(var(--color-action-foreground))] hover:bg-danger/90',
        outline: 'border-borderMy bg-surface text-clt-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// export { Badge, badgeVariants };
export { Badge };
