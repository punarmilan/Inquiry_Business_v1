import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApproveProviderApplication, useProviderApplicationsList, useRejectProviderApplication } from '@/hooks/useHyperlocal';

export const ProviderApplicationsPage = () => {
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | ''>('pending');
  const { data, isLoading } = useProviderApplicationsList({ limit: 100, ...(status ? { status } : {}) });
  const approve = useApproveProviderApplication();
  const reject = useRejectProviderApplication();

  const approveApplication = (id: string) => {
    const password = window.prompt('Set provider login password (minimum 6 characters):') || '';
    if (password.length < 6) return toast.error('Password must be at least 6 characters.');
    approve.mutate({ id, password }, { onSuccess: () => toast.success('Provider approved and login created.'), onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Approval failed.') });
  };

  const rejectApplication = (id: string) => {
    const reason = window.prompt('Reason for rejection (optional):') || '';
    reject.mutate({ id, reason }, { onSuccess: () => toast.success('Application rejected.'), onError: (e: any) => toast.error(e.response?.data?.error?.message || 'Rejection failed.') });
  };

  return <div className="space-y-6">
    <PageHeader title="Provider Applications" description="Review skilled worker applications before creating their provider login." />
    <div className="flex gap-2">
      {(['pending', 'approved', 'rejected', ''] as const).map((value) => <Button key={value || 'all'} size="sm" variant={status === value ? 'default' : 'outline'} onClick={() => setStatus(value)}>{value || 'All'}</Button>)}
    </div>
    {isLoading ? <p className="text-sm text-muted-foreground">Loading applications…</p> : !data?.data.length ? <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No {status || ''} provider applications.</CardContent></Card> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.data.map((application) => <Card key={application._id}><CardHeader><CardTitle className="flex items-center justify-between text-base">{application.name}<StatusBadge status={application.status} /></CardTitle></CardHeader><CardContent className="space-y-2 text-sm"><p className="font-medium">{application.phone}{application.email ? ` · ${application.email}` : ''}</p><p>{application.city?.name || 'Location unavailable'} · {application.experienceYears || 0} years experience</p><p><span className="font-medium">Skills:</span> {application.categories?.map((category) => category.name).join(', ') || '—'}</p><p className="text-muted-foreground"><span className="font-medium">Areas:</span> {application.serviceAreas?.join(', ') || 'Not specified'}</p>{application.message ? <p className="rounded-md bg-muted p-2 text-muted-foreground">{application.message}</p> : null}{application.rejectionReason ? <p className="text-destructive">Reason: {application.rejectionReason}</p> : null}<p className="text-xs text-muted-foreground">Applied {new Date(application.createdAt).toLocaleString()}</p>{application.status === 'pending' ? <div className="flex gap-2 pt-2"><Button size="sm" onClick={() => approveApplication(application._id)} disabled={approve.isPending || reject.isPending}>Approve & create login</Button><Button size="sm" variant="outline" onClick={() => rejectApplication(application._id)} disabled={approve.isPending || reject.isPending}>Reject</Button></div> : null}</CardContent></Card>)}</div>}
  </div>;
};
