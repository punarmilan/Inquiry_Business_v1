import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { DotsThree } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActionButtonsProps {
  actions: Array<{
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    icon?: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    dividerBefore?: boolean;
  }>;
  triggerLabel?: string;
  triggerIcon?: React.ReactNode;
  className?: string;
}

export const ActionButtons = ({
  actions,
  triggerLabel = 'Actions',
  triggerIcon,
  className,
}: ActionButtonsProps) => {
  const primaryActions = actions.filter((a) => a.variant !== 'destructive' && a.variant !== 'ghost');
  const secondaryActions = actions.filter((a) => a.variant === 'outline' || a.variant === 'ghost');
  const destructiveActions = actions.filter((a) => a.variant === 'destructive');

  if (actions.length <= 2) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        {actions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || 'outline'}
            size="sm"
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className="h-8 gap-1.5 px-2.5"
          >
            {action.loading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              action.icon
            )}
            {!action.icon && <span className="text-xs">{action.label}</span>}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2.5">
            {triggerIcon || <DotsThree className="h-4 w-4" />}
            <span className="hidden sm:inline text-xs">{triggerLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
        {primaryActions.map((action, index) => (
          <DropdownMenuItem
            key={index}
            onClick={action.onClick}
            disabled={action.disabled || action.loading}
            className={cn('flex items-center gap-2', action.loading && 'opacity-50')}
          >
            {action.loading ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              action.icon
            )}
            {action.label}
          </DropdownMenuItem>
        ))}
        {(secondaryActions.length > 0 || destructiveActions.length > 0) && (
          <>
            <DropdownMenuSeparator />
            {secondaryActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={cn('flex items-center gap-2', action.loading && 'opacity-50')}
              >
                {action.icon}
                {action.label}
              </DropdownMenuItem>
            ))}
            {destructiveActions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {destructiveActions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    disabled={action.disabled || action.loading}
                    className={cn('text-destructive focus:text-destructive flex items-center gap-2', action.loading && 'opacity-50')}
                  >
                    {action.icon}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
