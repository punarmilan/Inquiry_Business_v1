import { useState } from 'react';
import { toast } from 'sonner';
import type { PlanRecord } from '@/api/hyperlocal';
import { usePlansList, useCreatePlan, useUpdatePlan } from '@/hooks/useHyperlocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';

const NUMERIC_FIELDS = [
  'price',
  'durationDays',
  'offerPostingLimit',
  'maximumActiveOffers',
  'featuredOfferAllowance',
  'imagesPerOffer',
  'priorityRanking',
  'sortOrder',
] as const;

const initial = {
  name: '',
  code: '',
  description: '',
  price: '0',
  billingPeriod: 'monthly',
  durationDays: '30',
  offerPostingLimit: '3',
  maximumActiveOffers: '3',
  featuredOfferAllowance: '0',
  imagesPerOffer: '3',
  analyticsAccess: false,
  priorityRanking: '0',
  verificationBenefit: false,
  isActive: true,
  sortOrder: '0',
};

export const PlansPage = () => {
  const [form, setForm] = useState(initial);
  const [editing, setEditing] = useState('');

  const { data: plans, isLoading } = usePlansList();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  const save = () => {
    const payload = {
      ...form,
      ...Object.fromEntries(NUMERIC_FIELDS.map((key) => [key, Number(form[key])])),
    };
    const onSettled = {
      onSuccess: () => {
        toast.success('Plan saved.');
        setEditing('');
        setForm(initial);
      },
      onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to save plan.'),
    };
    if (editing) updatePlan.mutate({ id: editing, payload }, onSettled);
    else createPlan.mutate(payload, onSettled);
  };

  const edit = (p: PlanRecord) => {
    setEditing(p._id);
    setForm({
      name: p.name,
      code: p.code,
      description: p.description || '',
      price: String(p.price),
      billingPeriod: p.billingPeriod,
      durationDays: String(p.durationDays),
      offerPostingLimit: String(p.offerPostingLimit),
      maximumActiveOffers: String(p.maximumActiveOffers),
      featuredOfferAllowance: String(p.featuredOfferAllowance),
      imagesPerOffer: String(p.imagesPerOffer),
      analyticsAccess: p.analyticsAccess,
      priorityRanking: String(p.priorityRanking),
      verificationBenefit: p.verificationBenefit,
      isActive: p.isActive,
      sortOrder: String(p.sortOrder || 0),
    });
  };

  const saving = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="space-y-6">
      <PageHeader title="Subscription Plans" description="Server-enforced prices, quotas, images and ranking benefits." />

      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Edit' : 'Add'} plan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2 text-sm font-medium">
              Plan name
              <Input placeholder="e.g. Pro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Plan code
              <Input
                placeholder="e.g. PRO"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })}
              />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Billing period
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal"
                value={form.billingPeriod}
                onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}
              >
                {['monthly', 'quarterly', 'yearly', 'custom'].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium md:col-span-3">
              Plan description
              <Input
                placeholder="e.g. For growing local businesses"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <label className="space-y-2 text-sm font-medium">
              Price (₹)
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">₹</span>
                <Input
                  className="pl-7"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 299"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </div>
              <span className="block text-xs font-normal text-muted-foreground">Enter 0 for a free plan.</span>
            </label>
            <label className="space-y-2 text-sm font-medium">
              Validity (days)
              <Input type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Total offer posts
              <Input type="number" min="-1" value={form.offerPostingLimit} onChange={(e) => setForm({ ...form, offerPostingLimit: e.target.value })} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Maximum active offers
              <Input type="number" min="-1" value={form.maximumActiveOffers} onChange={(e) => setForm({ ...form, maximumActiveOffers: e.target.value })} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Featured offer allowance
              <Input type="number" min="0" value={form.featuredOfferAllowance} onChange={(e) => setForm({ ...form, featuredOfferAllowance: e.target.value })} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Images per offer
              <Input type="number" min="1" value={form.imagesPerOffer} onChange={(e) => setForm({ ...form, imagesPerOffer: e.target.value })} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Priority ranking
              <Input type="number" min="0" value={form.priorityRanking} onChange={(e) => setForm({ ...form, priorityRanking: e.target.value })} />
            </label>
            <label className="space-y-2 text-sm font-medium">
              Display order
              <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
            </label>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-lg border bg-muted/30 p-4">
            {([
              ['analyticsAccess', 'Analytics access'],
              ['verificationBenefit', 'Verification benefit'],
              ['isActive', 'Plan is active'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-2 md:col-span-3">
            <Button onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save plan'}
            </Button>
            {editing && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing('');
                  setForm(initial);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading plans…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {plans?.map((p) => (
            <Card key={p._id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-2xl font-bold">₹{p.price}</p>
                <p>
                  {p.offerPostingLimit === -1 ? 'Unlimited' : p.offerPostingLimit} posts · {p.imagesPerOffer} images
                </p>
                <p>{p.isActive ? 'Active' : 'Inactive'}</p>
                <Button variant="outline" onClick={() => edit(p)}>
                  Edit
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
