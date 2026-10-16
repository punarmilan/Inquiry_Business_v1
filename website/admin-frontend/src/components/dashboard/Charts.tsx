import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartLineUp, DotsThreeVertical, CurrencyInr, ChartPie } from '@phosphor-icons/react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CompareWindow, DashboardInsights, PerformancePoint } from '@/types';
import { cn } from '@/lib/utils';
import { CardSkeleton, DashboardCard, DashboardCardHeader, TrendChip, ViewAllLink } from './DashboardCard';
import { formatCount, formatCountShort, formatDayShort, formatINR, formatINRShort, percentChange } from './format';

const AXIS_TICK = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };

const SERIES = [
  { key: 'users', label: 'Users', color: '#14b8a6', format: formatCount },
  { key: 'businesses', label: 'Businesses', color: '#a78bfa', format: formatCount },
  { key: 'revenue', label: 'Revenue', color: '#f59e0b', format: formatINR },
] as const;

const RANGES: { value: CompareWindow; label: string }[] = [
  { value: 7, label: '7D' },
  { value: 30, label: '30D' },
  { value: 90, label: '90D' },
];

const ChartTooltipCard = ({ title, rows }: { title: string; rows: { label: string; value: string; color: string }[] }) => (
  <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-lg">
    <p className="mb-1 font-semibold text-foreground">{title}</p>
    {rows.map((row) => (
      <p key={row.label} className="flex items-center gap-2 text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
        <span className="flex-1">{row.label}</span>
        <span className="font-semibold text-foreground">{row.value}</span>
      </p>
    ))}
  </div>
);

interface PerformanceProps {
  series?: PerformancePoint[];
  range: CompareWindow;
  onRangeChange: (range: CompareWindow) => void;
  loading: boolean;
}

export const PerformanceChart = ({ series, range, onRangeChange, loading }: PerformanceProps) => {
  const points = series ?? [];
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <DashboardCard className="flex flex-col">
      <DashboardCardHeader
        icon={ChartLineUp}
        title="Platform Performance"
        action={(
          <div className="flex items-center gap-1">
            <div className="flex rounded-full bg-muted p-1" role="tablist" aria-label="Range">
              {RANGES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="tab"
                  aria-selected={range === option.value}
                  onClick={() => onRangeChange(option.value)}
                  className={cn('rounded-full px-3 py-1 text-xs font-bold transition-colors', range === option.value ? 'bg-gradient-to-r from-[#15a79c] to-[#0d8781] text-white shadow' : 'text-muted-foreground hover:text-foreground')}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted" aria-label="More options">
                  <DotsThreeVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl">
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg"><Link to="/analytics">Open revenue analytics</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      />

      <div className="mb-3 grid grid-cols-3 gap-3">
        {SERIES.map((item) => (
          <div key={item.key} className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.label}
            </p>
            {loading || !last ? (
              <CardSkeleton className="mt-1.5 h-6 w-20" />
            ) : (
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-lg font-extrabold text-foreground">{item.format(last[item.key])}</span>
                <TrendChip change={percentChange(last[item.key], first[item.key])} />
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Fixed height: a flex-grown box would feed back into ResponsiveContainer's measurement and keep growing. */}
      <div className="h-[240px]">
        {loading && !points.length ? (
          <CardSkeleton className="h-full" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                {SERIES.map((item) => (
                  <linearGradient key={item.key} id={`perf-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={item.color} stopOpacity={item.key === 'users' ? 0.28 : 0.14} />
                    <stop offset="100%" stopColor={item.color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="0" />
              <XAxis dataKey="date" tickFormatter={formatDayShort} tick={AXIS_TICK} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis yAxisId="count" tickFormatter={formatCountShort} tick={AXIS_TICK} axisLine={false} tickLine={false} width={48} allowDecimals={false} />
              {/* Revenue is rupees, not a count — it gets its own (hidden) scale so it doesn't flatten the others. */}
              <YAxis yAxisId="revenue" orientation="right" hide />
              <Tooltip
                cursor={{ stroke: 'hsl(var(--border))' }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipCard
                      title={formatDayShort(String(label))}
                      rows={SERIES.map((item) => ({ label: item.label, value: item.format(Number(payload[0].payload[item.key])), color: item.color }))}
                    />
                  ) : null
                }
              />
              {SERIES.map((item) => (
                <Area
                  key={item.key}
                  yAxisId={item.key === 'revenue' ? 'revenue' : 'count'}
                  type="monotone"
                  dataKey={item.key}
                  stroke={item.color}
                  strokeWidth={2.5}
                  fill={`url(#perf-${item.key})`}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  );
};

const CATEGORY_COLORS = ['#14b8a6', '#3b82f6', '#f59e0b', '#22c55e', '#a855f7'];
const OTHERS_COLOR = '#94a3b8';

export const CategoryDistributionCard = ({ data, loading }: { data?: DashboardInsights['categoryDistribution']; loading: boolean }) => {
  const total = data?.total ?? 0;
  const slices = (data?.categories ?? []).map((row, index) => ({
    ...row,
    color: row.category === 'Others' ? OTHERS_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    share: total ? Math.round((row.count / total) * 100) : 0,
  }));
  return (
    <DashboardCard>
      <DashboardCardHeader icon={ChartPie} title="Service Category Distribution" action={<ViewAllLink to="/businesses" />} />
      {loading ? (
        <CardSkeleton className="h-[260px]" />
      ) : total === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No businesses registered yet.</p>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="relative h-[176px] w-[176px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={slices} dataKey="count" nameKey="category" innerRadius={58} outerRadius={84} paddingAngle={slices.length > 1 ? 2 : 0} cornerRadius={4} stroke="none" startAngle={90} endAngle={-270}>
                  {slices.map((slice) => <Cell key={slice.category} fill={slice.color} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <ChartTooltipCard
                        title={String(payload[0].name)}
                        rows={[{ label: 'Businesses', value: formatCount(Number(payload[0].value)), color: String(payload[0].payload.color) }]}
                      />
                    ) : null
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xs text-muted-foreground">Total</span>
              <span className="text-2xl font-extrabold text-foreground">{formatCount(total)}</span>
              <span className="text-xs text-muted-foreground">Businesses</span>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 space-y-3">
            {slices.map((slice) => (
              <li key={slice.category} className="flex items-center gap-2.5 text-[13px]">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="min-w-0 flex-1 truncate text-foreground/80" title={slice.category}>{slice.category}</span>
                <span className="font-semibold text-foreground">{slice.share}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </DashboardCard>
  );
};

export const RevenueOverviewCard = ({ data, loading }: { data?: DashboardInsights['revenueLast7Days']; loading: boolean }) => {
  const points = data ?? [];
  const lastIndex = points.length - 1;
  return (
    <DashboardCard className="p-4">
      <DashboardCardHeader icon={CurrencyInr} title="Revenue Overview" action={<ViewAllLink to="/analytics">View Details</ViewAllLink>} />
      {loading ? (
        <CardSkeleton className="h-[220px]" />
      ) : (
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 34, right: 4, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id="revenue-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2dd4bf" />
                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.75} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tickFormatter={formatDayShort} tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={4} />
              <YAxis tickFormatter={formatINRShort} tick={{ ...AXIS_TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={46} allowDecimals={false} />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))', radius: 8 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <ChartTooltipCard title={formatDayShort(String(label))} rows={[{ label: 'Revenue', value: formatINR(Number(payload[0].value)), color: '#14b8a6' }]} />
                  ) : null
                }
              />
              <Bar dataKey="revenue" radius={[8, 8, 0, 0]} maxBarSize={30}>
                {points.map((point, index) => <Cell key={point.date} fill={index === lastIndex ? '#0f766e' : 'url(#revenue-bar)'} />)}
                <LabelList
                  dataKey="revenue"
                  content={({ x, y, width, index }) => {
                    if (index !== lastIndex || x === undefined || y === undefined || width === undefined) return null;
                    const cx = Number(x) + Number(width) / 2;
                    const text = formatINR(points[lastIndex].revenue);
                    const boxWidth = Math.max(58, text.length * 7 + 14);
                    return (
                      <g>
                        <rect x={cx - boxWidth / 2} y={Number(y) - 32} width={boxWidth} height={24} rx={7} fill="#0f766e" />
                        <text x={cx} y={Number(y) - 16} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={700}>{text}</text>
                      </g>
                    );
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </DashboardCard>
  );
};
