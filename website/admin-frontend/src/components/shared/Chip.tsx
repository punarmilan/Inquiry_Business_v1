import { cn } from '@/lib/utils';
import { X } from '@phosphor-icons/react';

interface ChipProps {
  label: string;
  onRemove?: () => void;
  imageUrl?: string;
  className?: string;
  variant?: 'default' | 'removable' | 'with-image';
}

export const Chip = ({ label, onRemove, imageUrl, className, variant = 'default' }: ChipProps) => (
  <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium', className)}>
    {imageUrl && variant === 'with-image' && (
      <img src={imageUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
    )}
    {label}
    {onRemove && (
      <button
        type="button"
        className="flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-destructive transition-colors"
        onClick={onRemove}
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    )}
  </span>
);
