import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Buildings, ArrowElbowDownLeft, Spinner, MapPin, MagnifyingGlass, Ticket, User, Users, type IconProps } from '@phosphor-icons/react';
import type { ForwardRefExoticComponent, RefAttributes } from 'react';
import { useGlobalSearch } from '@/hooks/useDashboardStats';
import type { GlobalSearchResults } from '@/types';
import { cn } from '@/lib/utils';
import { navItems } from './navigation';

type PhosphorIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

interface ResultRow {
  key: string;
  group: string;
  label: string;
  detail: string;
  icon: PhosphorIcon;
  to: string;
}

const ENTITY_GROUPS: { key: keyof GlobalSearchResults; group: string; icon: PhosphorIcon; to: (hit: { id: string; label: string }) => string }[] = [
  { key: 'users', group: 'Users', icon: User, to: (hit) => `/users/${hit.id}` },
  { key: 'businesses', group: 'Businesses', icon: Buildings, to: (hit) => `/businesses?q=${encodeURIComponent(hit.label)}` },
  { key: 'providers', group: 'Providers', icon: Users, to: (hit) => `/workers?q=${encodeURIComponent(hit.label)}` },
  { key: 'offers', group: 'Offers', icon: Ticket, to: () => '/offers' },
  { key: 'cities', group: 'Cities', icon: MapPin, to: () => '/cities' },
];

const useDebounced = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
};

export const GlobalSearch = ({ className }: { className?: string }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const term = useDebounced(query.trim(), 250);
  const { data, isFetching } = useGlobalSearch(term);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const rows = useMemo<ResultRow[]>(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];
    const pages: ResultRow[] = navItems
      .filter((item) => `${item.label} ${item.keywords ?? ''}`.toLowerCase().includes(needle))
      .slice(0, 4)
      .map((item) => ({ key: `page-${item.to}`, group: 'Pages', label: item.label, detail: 'Go to page', icon: item.icon, to: item.to }));
    const entities = data && term.length >= 2
      ? ENTITY_GROUPS.flatMap(({ key, group, icon, to }) =>
          data[key].map((hit) => ({ key: `${key}-${hit.id}`, group, label: hit.label, detail: hit.detail, icon, to: to(hit) })))
      : [];
    return [...pages, ...entities];
  }, [query, data, term]);

  useEffect(() => setHighlight(0), [rows.length]);

  const go = (row: ResultRow) => {
    navigate(row.to);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((current) => Math.min(current + 1, rows.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, rows.length - 1));
    } else if (event.key === 'Enter' && rows[highlight]) {
      event.preventDefault();
      go(rows[highlight]);
    }
  };

  const showPanel = open && query.trim().length > 0;
  const searching = isFetching || term !== query.trim();

  return (
    <div className={cn('relative', className)}>
      <MagnifyingGlass className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={onKeyDown}
        placeholder="Search anything... (cities, users, offers, businesses...)"
        aria-label="Search the admin panel"
        className="h-11 w-full rounded-xl border border-transparent bg-muted/70 pl-11 pr-20 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-card focus:ring-4 focus:ring-primary/10 [&::-webkit-search-cancel-button]:hidden"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border bg-card px-2 py-0.5 font-sans text-[11px] font-medium text-muted-foreground sm:block">
        Ctrl + K
      </kbd>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[420px] overflow-y-auto rounded-2xl border bg-popover p-2 shadow-xl">
          {rows.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              {searching ? <><Spinner className="h-4 w-4 animate-spin" /> Searching…</> : term.length < 2 ? 'Keep typing to search records…' : `No results for "${query.trim()}".`}
            </div>
          ) : (
            rows.map((row, index) => (
              <div key={row.key}>
                {index === 0 || rows[index - 1].group !== row.group ? (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{row.group}</p>
                ) : null}
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => go(row)}
                  onMouseEnter={() => setHighlight(index)}
                  className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm', index === highlight ? 'bg-accent text-accent-foreground' : 'hover:bg-muted')}
                >
                  <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{row.label}</span>
                    {row.detail ? <span className="block truncate text-xs text-muted-foreground">{row.detail}</span> : null}
                  </span>
                  {index === highlight ? <ArrowElbowDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                </button>
              </div>
            ))
          )}
          {rows.length > 0 && searching ? (
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><Spinner className="h-3 w-3 animate-spin" /> Looking for more…</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
