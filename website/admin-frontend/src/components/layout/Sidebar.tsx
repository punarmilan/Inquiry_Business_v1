import { Link, NavLink } from 'react-router-dom';
import { CaretRight, Rocket } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { navGroups } from './navigation';

export const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
  <div className="flex h-full flex-col">
    <Link to="/" onClick={onNavigate} className="flex h-[76px] shrink-0 items-center gap-3 px-6">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#16b3a6] to-[#0b7f7a] text-[15px] font-extrabold tracking-wide text-white shadow-[0_8px_18px_-8px_rgba(13,148,136,0.7)]">
        IE
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[17px] font-bold leading-tight text-foreground">InquiryExperts</span>
        <span className="block text-xs text-muted-foreground">Admin Control Center</span>
      </span>
    </Link>

    <nav className="flex-1 overflow-y-auto px-4 pb-4" aria-label="Main">
      {navGroups.map((group, index) => (
        <div key={group.label ?? index} className={index === 0 ? 'mt-3' : 'mt-6'}>
          {group.label ? (
            <p className="mb-2 px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground/80">{group.label}</p>
          ) : null}
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gradient-to-r from-[#15a79c] to-[#0d8781] font-semibold text-white shadow-[0_10px_20px_-10px_rgba(13,148,136,0.75)]'
                      : 'text-foreground/75 hover:bg-accent hover:text-foreground'
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </nav>

    <div className="shrink-0 p-4">
      <Link
        to="/offers"
        onClick={onNavigate}
        className="group flex items-center gap-3 rounded-2xl bg-gradient-to-br from-accent to-accent/60 p-4 transition-colors hover:from-accent hover:to-accent"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-sm">
          <Rocket className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block whitespace-nowrap text-[12.5px] font-bold text-foreground">Grow Your Business</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">Manage offers, reach more customers, increase revenue.</span>
        </span>
        <CaretRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  </div>
);

export const Sidebar = () => (
  <aside className="hidden w-[264px] shrink-0 border-r bg-card lg:block">
    <SidebarContent />
  </aside>
);
