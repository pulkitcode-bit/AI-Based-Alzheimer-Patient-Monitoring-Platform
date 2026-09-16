import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs sm:text-sm font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3.5 gap-1.5 [&>svg]:pointer-events-none transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/40 shadow-soft-xs overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-primary/20 bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary-foreground',
        solid:
          'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary:
          'border-secondary-foreground/10 bg-secondary text-secondary-foreground',
        destructive:
          'border-destructive/20 bg-destructive/15 text-destructive dark:bg-destructive/25',
        success:
          'border-success/20 bg-success/15 text-success dark:bg-success/25',
        outline:
          'border-border text-foreground bg-background/60 [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return (
    <Comp
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
