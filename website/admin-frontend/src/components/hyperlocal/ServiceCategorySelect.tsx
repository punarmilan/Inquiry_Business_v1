import { useCallback, useEffect, useRef, useState } from 'react';
import { CaretDown, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { CategoryRecord } from '@/api/hyperlocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ServiceCategorySelectProps {
  id: string;
  categories: Pick<CategoryRecord, '_id' | 'name' | 'isActive'>[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

const MAX_CATEGORIES = 20;

export const ServiceCategorySelect = ({ id, categories, value, onChange, disabled, loading, error, onRetry }: ServiceCategorySelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => { setOpen(false); setSearch(''); }, []);
  const selected = value.map((categoryId) => categories.find((category) => category._id === categoryId));
  const filtered = categories.filter((category) =>
    (category.isActive || value.includes(category._id)) && category.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const unavailable = disabled || loading || error;

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  const toggle = (categoryId: string) => {
    if (value.includes(categoryId)) onChange(value.filter((selectedId) => selectedId !== categoryId));
    else if (value.length < MAX_CATEGORIES) onChange([...value, categoryId]);
  };

  return (
    <div
      ref={rootRef}
      className="space-y-1.5"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) close(); }}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) {
          event.preventDefault();
          event.stopPropagation();
          close();
          triggerRef.current?.focus();
        }
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault();
      }}
    >
      <label htmlFor={id} className="flex items-center gap-1.5 text-sm font-medium">
        Service Categories <span className="text-destructive" aria-hidden="true">*</span>
      </label>
      <div className="relative">
        <Button
          ref={triggerRef}
          id={id}
          type="button"
          variant="outline"
          className="min-h-11 w-full justify-between gap-3 font-normal"
          disabled={unavailable}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={`${id}-popup`}
          aria-describedby={`${id}-description`}
          onClick={() => { if (open) close(); else setOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              if (open) searchRef.current?.focus();
              else setOpen(true);
            }
          }}
        >
          <span className={`min-w-0 truncate ${value.length ? '' : 'text-muted-foreground'}`}>
            {loading ? 'Loading categories...' : value.length === 1 ? selected[0]?.name || '1 category selected' : value.length ? `${value.length} categories selected` : 'Search and select categories'}
          </span>
          <CaretDown aria-hidden="true" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
        </Button>
        {open && (
          <div id={`${id}-popup`} role="dialog" aria-label="Choose service categories" className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
            <div className="relative border-b p-3">
              <MagnifyingGlass aria-hidden="true" className="pointer-events-none absolute left-6 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                type="search"
                aria-label="Search service categories"
                placeholder="Search service categories..."
                className="min-h-11 pl-9"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    rootRef.current?.querySelector<HTMLInputElement>('input[type="checkbox"]:not(:disabled)')?.focus();
                  }
                }}
              />
            </div>
            <div className="max-h-[min(15rem,35vh)] overflow-y-auto overscroll-contain p-1.5" role="group" aria-label="Service category options">
              {filtered.map((category) => (
                <label key={category._id} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent focus-within:bg-accent">
                  <input
                    type="checkbox"
                    className="h-4 w-4 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    checked={value.includes(category._id)}
                    disabled={unavailable || (!value.includes(category._id) && value.length >= MAX_CATEGORIES)}
                    onChange={() => toggle(category._id)}
                  />
                  <span className="min-w-0 break-words">{category.name}{!category.isActive && <span className="text-muted-foreground"> (Inactive)</span>}</span>
                </label>
              ))}
              {!filtered.length && <p className="px-3 py-6 text-center text-sm text-muted-foreground" role="status">{search.trim() ? 'No categories match your search.' : 'No active categories available.'}</p>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
              <span className="text-xs text-muted-foreground" role="status">{value.length} / {MAX_CATEGORIES} selected</span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" className="min-h-11" disabled={!value.length || unavailable} onClick={() => { onChange([]); searchRef.current?.focus(); }}>Clear selection</Button>
                <Button type="button" className="min-h-11" onClick={() => { close(); triggerRef.current?.focus(); }}>Done</Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {!!value.length && (
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Selected service categories">
          {value.map((categoryId, index) => (
            <li key={categoryId} className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted pl-2 text-sm">
              <span className="min-w-0 truncate" title={selected[index]?.name}>{selected[index]?.name || 'Unavailable category'}</span>
              <button type="button" disabled={unavailable} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" aria-label={`Remove ${selected[index]?.name || 'unavailable category'}`} onClick={() => { toggle(categoryId); triggerRef.current?.focus(); }}><X aria-hidden="true" className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      )}
      <p id={`${id}-description`} className="text-xs text-muted-foreground">Select one or more categories, up to {MAX_CATEGORIES}.</p>
      {error && <p role="alert" className="text-sm text-destructive">Could not load categories. <button type="button" className="underline underline-offset-2" onClick={onRetry}>Try again</button></p>}
    </div>
  );
};
