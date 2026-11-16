import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { navGroups } from './navigation';

/** One set of destinations and labels for the sidebar and mobile drawer. */
export function AdminNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { pathname } = useLocation();
  return <nav aria-label="Admin navigation" className="space-y-5">
    {navGroups.map(group => <div key={group.label}>
      {group.items.length > 1 && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>}
      <div className="space-y-0.5">
        {group.items.map(item => {
          const active = item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return <Link key={item.to} to={item.to} onClick={onNavigate} aria-current={active ? 'page' : undefined}
            className={cn('flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent',
              active ? 'bg-accent font-semibold text-accent-foreground' : 'text-foreground/75 hover:bg-muted hover:text-foreground')}>
            <item.icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" weight={active ? 'duotone' : 'regular'} />
            <span>{group.items.length === 1 ? group.label : item.label}</span>
          </Link>;
        })}
      </div>
    </div>)}
  </nav>;
}
