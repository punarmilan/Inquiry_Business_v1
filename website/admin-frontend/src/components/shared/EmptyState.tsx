import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center gap-3 py-10 text-center', className)}>
    {icon && <div className="h-12 w-12 text-muted-foreground">{icon}</div>}
    <div>
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);