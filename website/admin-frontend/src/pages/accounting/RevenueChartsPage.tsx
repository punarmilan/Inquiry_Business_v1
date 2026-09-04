import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRevenueSeries } from '@/hooks/useDashboardStats';

const COMMISSION_COLOR = 'hsl(var(--secondary))';
const VOLUME_COLOR = 'hsl(var(--primary))';
const CHART_GRID_COLOR = 'hsl(var(--border))';
const CHART_AXIS_COLOR = 'hsl(var(--muted-foreground))';
const CHART_DOT_STROKE = 'hsl(var(--card))';

type Granularity = 'daily' | 'weekly' | 'monthly';

export const RevenueChartsPage = () => {
  const [granularity, setGranularity] = useState<Granularity>('daily');
  const { data: series, isLoading } = useRevenueSeries({ granularity });

  return (
    <div>
      <PageHeader title="Revenue Dashboard" description="Platform commission earned over time." />

      <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)} className="mb-4">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Commission &amp; gross transaction volume ({granularity})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !series?.length ? (
            <p className="text-sm text-muted-foreground">No transactions in this range yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={360}>
              <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke={CHART_GRID_COLOR} vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                  axisLine={{ stroke: CHART_GRID_COLOR }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: CHART_AXIS_COLOR }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v.toLocaleString()}`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    border: `1px solid ${CHART_GRID_COLOR}`,
                    background: 'hsl(var(--popover))',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="commission"
                  name="Platform Commission"
                  stroke={COMMISSION_COLOR}
                  strokeWidth={2}
                  dot={{ r: 4, fill: COMMISSION_COLOR, strokeWidth: 2, stroke: CHART_DOT_STROKE }}
                />
                <Line
                  type="monotone"
                  dataKey="volume"
                  name="Gross Volume"
                  stroke={VOLUME_COLOR}
                  strokeWidth={2}
                  dot={{ r: 4, fill: VOLUME_COLOR, strokeWidth: 2, stroke: CHART_DOT_STROKE }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
