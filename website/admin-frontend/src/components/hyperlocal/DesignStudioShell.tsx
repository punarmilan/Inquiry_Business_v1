import { useEffect, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

// Self-contained SVGs to ensure 100% compatibility in test environments and browser runtime
const SvgPalette = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M200.77,53.41A103.27,103.27,0,0,0,128,24h-1.07A104,104,0,0,0,24,128c0,42.54,26.47,80,66.6,94.24a16.27,16.27,0,0,0,17.75-4.14l16.14-16.73a8.21,8.21,0,0,1,6-2.37h17.51A88.1,88.1,0,0,0,236,111C236,89.55,223.51,69.57,200.77,53.41ZM76,140a12,12,0,1,1,12-12A12,12,0,0,1,76,140Zm28-48a12,12,0,1,1,12-12A12,12,0,0,1,104,92Zm48,0a12,12,0,1,1,12-12A12,12,0,0,1,152,92Zm28,48a12,12,0,1,1,12-12A12,12,0,0,1,180,140Z" />
  </svg>
);

const SvgGridFour = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48v48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48v48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48v48Z" />
  </svg>
);

const SvgSparkle = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M213.85,125.13l-45.74-17.76-17.76-45.74a16,16,0,0,0-29.84,0L102.75,107.37,57,125.13a16,16,0,0,0,0,29.84l45.74,17.76,17.76,45.74a16,16,0,0,0,29.84,0l17.76-45.74,45.74-17.76a16,16,0,0,0,0-29.84Z" />
  </svg>
);

const SvgCalendar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 256 256" fill="currentColor">
    <path d="M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z" />
  </svg>
);

interface StudioTab {
  to: string;
  label: string;
  icon: (props: { className?: string }) => ReactNode;
  stepKey: 'theme' | 'layout' | 'animation' | 'schedule' | 'trending' | 'home';
}

const STUDIO_TABS: StudioTab[] = [
  { to: '/home-content', label: 'Home cards & banners', icon: SvgGridFour, stepKey: 'home' },
  { to: '/home-showcase', label: 'Trending offers', icon: SvgGridFour, stepKey: 'trending' },
  { to: '/ui/pages/offersHome', label: 'Dynamic UI editor', icon: SvgGridFour, stepKey: 'layout' },
  { to: '/ui/themes', label: 'App colors', icon: SvgPalette, stepKey: 'theme' },
  { to: '/ui/animations', label: 'Animations', icon: SvgSparkle, stepKey: 'animation' },
  { to: '/ui/campaigns', label: 'Scheduled campaigns', icon: SvgCalendar, stepKey: 'schedule' },
];

interface DesignStudioShellProps {
  title: string;
  description: string;
  activeTab: 'theme' | 'layout' | 'animation' | 'schedule' | 'trending' | 'home';
  actions?: ReactNode;
  children: ReactNode;
}

export function DesignStudioShell({
  title,
  description,
  activeTab,
  actions,
  children,
}: DesignStudioShellProps) {
  const location = useLocation();
  useEffect(() => { document.title = `${title} · InquiryExperts Admin`; }, [title]);

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 shadow-sm">
        <div className="relative space-y-5">
          {/* Top Row: Brand & Page Title */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <Link to="/app-content" target="_blank" rel="noreferrer" className="inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">← App content overview (new tab)</Link>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>

            {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
          </div>

          {/* Middle Row: Studio Navigation Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border/60 pt-4">
            <nav
              aria-label="App content sections"
              className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-muted/60 p-1 border border-border/50"
            >
              {STUDIO_TABS.filter(tab => ['home', 'trending'].includes(activeTab) ? ['home', 'trending'].includes(tab.stepKey) : !['home', 'trending'].includes(tab.stepKey)).map((tab) => {
                const Icon = tab.icon;
                const isActive =
                  activeTab === tab.stepKey ||
                  (tab.stepKey === 'layout' && location.pathname.startsWith('/ui/pages/'));

                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    target="_blank"
                    rel="noreferrer"
                    className={cn(
                      'flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:bg-accent',
                      isActive
                        ? 'bg-card text-foreground shadow-xs ring-1 ring-border/50 text-primary'
                        : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                    )}
                  >
                    <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                    <span>{tab.label}</span>
                  </NavLink>
                );
              })}
            </nav>

          </div>
          <p className="text-xs text-muted-foreground">Related editors open in a new tab so you can keep your work here.</p>
        </div>
      </div>

      {/* Main Studio Workspace Content */}
      <div className="space-y-6">{children}</div>
    </div>
  );
}

