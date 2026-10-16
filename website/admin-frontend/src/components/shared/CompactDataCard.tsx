import * as React from 'react';
import { cn } from '@/lib/utils';
import { StatusBadge } from './StatusBadge';

interface CompactDataCardProps {
  className?: string;
  title: string;
  subtitle?: string;
  status?: string;
  statusLabel?: string;
  imageUrl?: string;
  fields?: Array<{ label: string; value: string | number; className?: string }>;
  tags?: string[];
  actions?: React.ReactNode;
  onClick?: () => void;
}

export const CompactDataCard = ({
  className,
  title,
  subtitle,
  status,
  statusLabel,
  imageUrl,
  fields = [],
  tags = [],
  actions,
  onClick,
}: CompactDataCardProps) => (
  <div
    className={cn(
      'group rounded-lg border bg-card shadow-sm transition-all hover:shadow-md',
      onClick && 'cursor-pointer',
      className
    )}
    onClick={onClick}
  >
    <div className="flex flex-col gap-3 p-3 lg:flex-row">
      {imageUrl && (
        <div className="flex-shrink-0 h-14 w-14 rounded-lg border overflow-hidden bg-muted/50">
          <img src={imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-semibold truncate">{title}</h4>
            {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          </div>
          {status && (
            <StatusBadge status={status} className="flex-shrink-0" />
          )}
        </div>

        {fields.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {fields.map((field, index) => (
              <div key={index} className={cn('flex items-center gap-1', field.className)}>
                <span className="text-muted-foreground">{field.label}</span>
                <span className="font-medium text-foreground">{field.value}</span>
              </div>
            ))}
          </div>
        )}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.slice(0, 4).map((tag) => (
              <span key={tag} className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {tag}
              </span>
            ))}
            {tags.length > 4 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                +{tags.length - 4} more
              </span>
            )}
          </div>
        )}

        {statusLabel && (
          <p className="mt-1 text-xs text-muted-foreground">{statusLabel}</p>
        )}
      </div>
      {actions && (
        <div className="flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  </div>
);
