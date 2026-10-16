import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, PencilSimple, CreditCard } from '@phosphor-icons/react';
import type { PlanRecord } from '@/api/hyperlocal';
import { usePlansList, useCreatePlan, useDeletePlan, useUpdatePlan } from '@/hooks/useHyperlocal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SectionCard } from '@/components/shared/SectionCard';
import { FormField } from '@/components/shared/FormField';
import { EmptyState } from '@/components/shared/EmptyState';
import { ActionButtons } from '@/components/shared/ActionButtons';
import { SearchFilterBar } from '@/components/shared/SearchFilterBar';

type PlanForm = {
  name: string;
  code: string;
  description: string;
  price: string;
  billingPeriod: string;
  durationDays: string;
  offerPostingLimit: string;
  maximumActiveOffers: string;
  featuredOfferAllowance: string;
  imagesPerOffer: string;
  analyticsAccess: boolean;
  priorityRanking: string;
  verificationBenefit: boolean;
  isActive: boolean;
  sortOrder: string;
};

const initialForm: PlanForm = {
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

const NUMERIC_FIELDS = [
  'price', 'durationDays', 'offerPostingLimit', 'maximumActiveOffers',
  'featuredOfferAllowance', 'imagesPerOffer', 'priorityRanking', 'sortOrder',
] as const;

export const PlansPage = () => {
  const [form, setForm] = useState<PlanForm>(initialForm);
  const [editing, setEditing] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: plans, isLoading } = usePlansList();
  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();
  const deletePlan = useDeletePlan();

  const filtered = useMemo(() => {
    if (!plans) return [];
    return plans.filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));
  }, [plans, search]);

  const save = () => {
    if (!form.name.trim()) { toast.error('Plan name is required.'); return; }
    const payload = {
      ...form,
      code: form.code || form.name.toUpperCase().replace(/\s+/g, '_'),
      ...Object.fromEntries(NUMERIC_FIELDS.map((key) => [key, Number(form[key])])),
    };
    const onSettled = {
      onSuccess: () => { toast.success('Plan saved.'); setEditing(''); setForm(initialForm); setShowForm(false); },
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
    setShowForm(true);
    document.getElementById('plan-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reset = () => { setEditing(''); setForm(initialForm); setShowForm(false); };
  const saving = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Subscription Plans"
        description="Define business subscription tiers and pricing."
        actions={
          <Button onClick={() => { setShowForm(!showForm); if (!showForm) { setEditing(''); setForm(initialForm); } }}>
            <Plus className="h-4 w-4" /> {showForm ? 'Cancel' : 'Add Plan'}
          </Button>
        }
      />

      {showForm && (
        <SectionCard id="plan-form" title={editing ? 'Edit Plan' : 'Add Plan'}>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <SectionCard collapsible defaultOpen title="Basic Information">
              <div className="grid gap-3 md:grid-cols-3">
                <FormField label="Plan Name" required>
                  <Input placeholder="e.g. Pro" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </FormField>
                <FormField label="Plan ID" description="Auto-generated from name if empty">
                  <Input placeholder="e.g. PRO" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '_') })} />
                </FormField>
                <FormField label="Billing Period">
                  <Select value={form.billingPeriod} onValueChange={(v) => setForm({ ...form, billingPeriod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['monthly', 'quarterly', 'yearly', 'custom'].map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
              <FormField label="Description">
                <Input placeholder="e.g. For growing local businesses" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </FormField>
            </SectionCard>

            <SectionCard collapsible defaultOpen title="Pricing & Billing">
              <div className="grid gap-3 md:grid-cols-4">
                <FormField label="Price (₹)" description="Enter 0 for a free plan">
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">₹</span>
                    <Input className="pl-7" type="number" min="0" placeholder="299" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                </FormField>
                <FormField label="Validity (Days)">
                  <Input type="number" min="1" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
                </FormField>
                <FormField label="Display Position">
                  <Input type="number" min="0" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} />
                </FormField>
                <FormField label="Priority">
                  <Input type="number" min="0" value={form.priorityRanking} onChange={(e) => setForm({ ...form, priorityRanking: e.target.value })} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard collapsible defaultOpen title="Usage Limits">
              <div className="grid gap-3 md:grid-cols-3">
                <FormField label="Total Offer Posts" description="Use -1 for unlimited">
                  <Input type="number" min="-1" value={form.offerPostingLimit} onChange={(e) => setForm({ ...form, offerPostingLimit: e.target.value })} />
                </FormField>
                <FormField label="Maximum Active Offers" description="Use -1 for unlimited">
                  <Input type="number" min="-1" value={form.maximumActiveOffers} onChange={(e) => setForm({ ...form, maximumActiveOffers: e.target.value })} />
                </FormField>
                <FormField label="Images Per Offer">
                  <Input type="number" min="1" value={form.imagesPerOffer} onChange={(e) => setForm({ ...form, imagesPerOffer: e.target.value })} />
                </FormField>
              </div>
            </SectionCard>

            <SectionCard collapsible defaultOpen title="Features & Status">
              <div className="grid gap-3 md:grid-cols-2">
                <FormField label="Featured Offer Allowance">
                  <Input type="number" min="0" value={form.featuredOfferAllowance} onChange={(e) => setForm({ ...form, featuredOfferAllowance: e.target.value })} />
                </FormField>
                <div className="flex flex-wrap gap-x-6 gap-y-3 rounded-lg border bg-muted/30 p-4">
                  {([
                    ['analyticsAccess', 'Analytics access'],
                    ['verificationBenefit', 'Verification benefit'],
                    ['isActive', 'Plan is active'],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm font-medium">
                      <input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="h-4 w-4 accent-primary" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </SectionCard>

            <div className="flex flex-wrap gap-2 border-t pt-3">
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Plan'}</Button>
              {editing && <Button type="button" variant="outline" onClick={reset} disabled={saving}>Cancel</Button>}
            </div>
          </form>
        </SectionCard>
      )}

      <SectionCard title="Plans" className="p-0">
        <div className="p-4 border-b">
          <SearchFilterBar searchValue={search} onSearchChange={setSearch} onClearSearch={() => setSearch('')} />
        </div>
        <div className="p-4">
          {isLoading ? (
            <EmptyState title="Loading plans…" />
          ) : filtered.length ? (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div key={p._id} className="group flex items-center gap-4 rounded-lg border bg-card p-3 hover:shadow-sm transition-all">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold truncate">{p.name}</h4>
                      <StatusBadge status={p.isActive ? 'active' : 'inactive'} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      ₹{p.price} · {p.billingPeriod} · {p.offerPostingLimit === -1 ? 'Unlimited' : p.offerPostingLimit} posts · {p.imagesPerOffer} images
                    </p>
                  </div>
                  <ActionButtons
                    actions={[
                      { label: 'Edit', onClick: () => edit(p), icon: <PencilSimple className="h-3.5 w-3.5" /> },
                      {
                        label: p.isActive ? 'Disable' : 'Enable',
                        onClick: () => updatePlan.mutate(
                          { id: p._id, payload: { isActive: !p.isActive } },
                          { onSuccess: () => toast.success(p.isActive ? 'Plan disabled.' : 'Plan enabled.'), onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to update plan.') },
                        ),
                        disabled: updatePlan.isPending,
                      },
                      {
                        label: 'Delete',
                        variant: 'destructive',
                        onClick: () => {
                          if (!window.confirm(`Delete "${p.name}" permanently? This cannot be undone.\n\nA plan that already has payments or subscriptions cannot be deleted; disable it instead.`)) return;
                          deletePlan.mutate(p._id, {
                            onSuccess: () => { toast.success('Plan deleted.'); if (editing === p._id) { setEditing(''); setForm(initialForm); } },
                            onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Failed to delete plan.'),
                          });
                        },
                        disabled: deletePlan.isPending,
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CreditCard className="h-8 w-8" />}
              title="No plans yet"
              description={search ? 'No plans match your search.' : 'Add your first subscription plan using the button above.'}
            />
          )}
        </div>
      </SectionCard>
    </div>
  );
};
