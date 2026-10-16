import * as React from 'react';
import { cn } from '@/lib/utils';

interface SectionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const SectionCard = React.forwardRef<HTMLDivElement, SectionCardProps>(
  ({ className, title, description, action, collapsible, defaultOpen = true, children, ...props }, ref) => {
    if (collapsible) {
      return (
        <details className={cn('rounded-lg border bg-card shadow-sm', className)} open={defaultOpen} ref={ref as React.Ref<HTMLDetailsElement>} {...(props as React.DetailsHTMLAttributes<HTMLDetailsElement>)}>
          <summary className={cn('flex items-center justify-between gap-3 cursor-pointer p-4 list-none', 'hover:bg-muted/30 transition-colors')}>
            <div className="flex-1 min-w-0">
              {title && <h3 className="font-semibold text-foreground">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </summary>
          <div className="px-4 pb-4 pt-2">{children}</div>
        </details>
      );
    }

    return (
      <div className={cn('rounded-lg border bg-card shadow-sm', className)} ref={ref} {...props}>
        {(title || description || action) && (
          <div className="flex items-start justify-between gap-3 p-4 border-b">
            <div className="flex-1 min-w-0">
              {title && <h3 className="font-semibold text-foreground">{title}</h3>}
              {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        )}
        <div className="p-4 pt-0">{children}</div>
      </div>
    );
  }
);

SectionCard.displayName = 'SectionCard';