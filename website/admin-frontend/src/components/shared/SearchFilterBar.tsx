import { cn } from '@/lib/utils';
import { MagnifyingGlass, Funnel, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SearchFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onClearSearch?: () => void;
  filters?: Array<{
    key: string;
    label: string;
    options: Array<{ value: string; label: string }>;
    value: string;
    onChange: (value: string) => void;
  }>;
  className?: string;
}

export const SearchFilterBar = ({
  searchValue,
  onSearchChange,
  onClearSearch,
  filters = [],
  className,
}: SearchFilterBarProps) => (
  <div className={cn('flex flex-wrap items-center gap-3', className)}>
    <div className="relative flex-1 min-w-[200px] max-w-sm">
      <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        className="pl-9 pr-9"
        placeholder="Search..."
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {searchValue && onClearSearch && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onClearSearch}
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>

    {filters.map((filter) => (
      <div key={filter.key} className="relative">
        <Funnel className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <select
          className="h-10 w-[160px] pl-9 pr-8 rounded-md border border-input bg-background px-3 text-sm appearance-none"
          value={filter.value}
          onChange={(e) => filter.onChange(e.target.value)}
        >
          <option value="">All {filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    ))}
  </div>
);
