import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, BadgeCheck, CheckCircle2, ExternalLink, ShieldCheck, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useUserDetail,
  useBlockUser,
  useUnblockUser,
  useVerifyUser,
  useApproveKyc,
  useRejectKyc,
  useApproveWallet,
  useRejectWallet,
} from '@/hooks/useUsers';

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString() : 'Not submitted');

const isWebUrl = (value?: string) => !!value && /^https?:\/\//i.test(value);

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="rounded-md border border-border bg-muted/30 p-3">
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 break-words text-sm font-medium">{value || 'Not provided'}</p>
  </div>
);

const DocumentRow = ({ label, url }: { label: string; url?: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">
        {url ? (isWebUrl(url) ? 'Uploaded document' : 'Saved, but not web-viewable') : 'Missing'}
      </p>
    </div>
    {isWebUrl(url) ? (
      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noreferrer">
          <ExternalLink className="mr-2 h-4 w-4" /> Open
        </a>
      </Button>
    ) : null}
  </div>
);

export const UserDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useUserDetail(id);
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const verifyUser = useVerifyUser();
  const approveKyc = useApproveKyc();
  const rejectKyc = useRejectKyc();
  const approveWallet = useApproveWallet();
  const rejectWallet = useRejectWallet();

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  const { user, jobsPosted, jobsWorked, ratingsReceived } = data;
  const kycStatus = user.kyc?.status ?? 'not_started';
  const walletStatus = user.wallet?.status ?? 'not_started';
  const approvalActionPending =
    approveKyc.isPending || rejectKyc.isPending || approveWallet.isPending || rejectWallet.isPending;

  const handleToggleBlock = () => {
    const mutation = user.isBlocked ? unblockUser : blockUser;
    mutation.mutate(user._id, {
      onSuccess: () => toast.success(user.isBlocked ? 'User unblocked.' : 'User blocked.'),
      onError: () => toast.error('Action failed.'),
    });
  };

  const handleVerify = () => {
    verifyUser.mutate(user._id, {
      onSuccess: () => toast.success('User manually verified.'),
      onError: () => toast.error('Failed to verify user.'),
    });
  };

  const handleApproveKyc = () => {
    approveKyc.mutate(user._id, {
      onSuccess: () => toast.success('KYC approved.'),
      onError: () => toast.error('Failed to approve KYC.'),
    });
  };

  const handleRejectKyc = () => {
    const reason = window.prompt('KYC reject reason', user.kyc?.rejectionReason || '');
    if (reason === null) return;
    rejectKyc.mutate(
      { id: user._id, reason },
      {
        onSuccess: () => toast.success('KYC rejected.'),
        onError: () => toast.error('Failed to reject KYC.'),
      }
    );
  };

  const handleApproveWallet = () => {
    approveWallet.mutate(user._id, {
      onSuccess: () => toast.success('Wallet approved.'),
      onError: () => toast.error('Failed to approve wallet.'),
    });
  };

  const handleRejectWallet = () => {
    const reason = window.prompt('Wallet reject reason', user.wallet?.rejectionReason || '');
    if (reason === null) return;
    rejectWallet.mutate(
      { id: user._id, reason },
      {
        onSuccess: () => toast.success('Wallet rejected.'),
        onError: () => toast.error('Failed to reject wallet.'),
      }
    );
  };

  return (
    <div>
      <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate('/users')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to users
      </Button>

      <PageHeader
        title={user.name || 'Unnamed user'}
        description={user.phone}
        actions={
          <>
            {!user.aadhaarVerification.isVerified && (
              <Button variant="outline" onClick={handleVerify} disabled={verifyUser.isPending}>
                <ShieldCheck className="mr-2 h-4 w-4" /> Manually Verify
              </Button>
            )}
            <Button
              variant={user.isBlocked ? 'default' : 'destructive'}
              onClick={handleToggleBlock}
              disabled={blockUser.isPending || unblockUser.isPending}
            >
              {user.isBlocked ? 'Unblock User' : 'Block User'}
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={user.isBlocked ? 'blocked' : 'active'} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verification</CardTitle>
          </CardHeader>
          <CardContent>
            {user.aadhaarVerification.isVerified ? (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                <BadgeCheck className="h-4 w-4" /> Aadhaar Verified
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Not verified</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">KYC</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={kycStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusBadge status={walletStatus} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rating</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {user.ratingAverage.toFixed(1)} ★ <span className="text-sm font-normal text-muted-foreground">({user.ratingCount})</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Jobs Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{user.jobsCompletedCount}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="posted">Posted Jobs ({jobsPosted.length})</TabsTrigger>
          <TabsTrigger value="worked">Worked Jobs ({jobsWorked.length})</TabsTrigger>
          <TabsTrigger value="ratings">Ratings Received ({ratingsReceived.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>KYC Approval</CardTitle>
              <StatusBadge status={kycStatus} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Submitted At" value={formatDateTime(user.kyc?.submittedAt)} />
                <InfoRow label="Verified At" value={user.kyc?.verifiedAt ? formatDateTime(user.kyc.verifiedAt) : undefined} />
              </div>

              <div className="space-y-2">
                <DocumentRow label="Aadhaar Card" url={user.kyc?.aadhaarCardUrl} />
                <DocumentRow label="Selfie" url={user.kyc?.selfieUrl} />
                {user.kyc?.drivingLicenseUrl ? <DocumentRow label="Driving License" url={user.kyc.drivingLicenseUrl} /> : null}
                {user.kyc?.categoryDocuments?.map((document) => (
                  <DocumentRow key={`${document.category}-${document.label}`} label={document.label} url={document.documentUrl} />
                ))}
              </div>

              {user.kyc?.rejectionReason ? (
                <p className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {user.kyc.rejectionReason}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleApproveKyc} disabled={approvalActionPending || kycStatus === 'verified'}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve KYC
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectKyc}
                  disabled={approvalActionPending || kycStatus === 'not_started'}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject KYC
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Wallet Approval</CardTitle>
              <StatusBadge status={walletStatus} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <InfoRow label="Submitted At" value={formatDateTime(user.wallet?.submittedAt)} />
                <InfoRow label="Verified At" value={user.wallet?.verifiedAt ? formatDateTime(user.wallet.verifiedAt) : undefined} />
                <InfoRow label="UPI" value={user.wallet?.upiId} />
                <InfoRow label="Account Holder" value={user.wallet?.bankAccountHolderName} />
                <InfoRow label="Account Number" value={user.wallet?.bankAccountNumber} />
                <InfoRow label="IFSC" value={user.wallet?.ifscCode} />
                <InfoRow label="PAN" value={user.wallet?.panNumber} />
              </div>

              {user.wallet?.rejectionReason ? (
                <p className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                  {user.wallet.rejectionReason}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleApproveWallet} disabled={approvalActionPending || walletStatus === 'verified'}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve Wallet
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleRejectWallet}
                  disabled={approvalActionPending || walletStatus === 'not_started'}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject Wallet
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posted" className="mt-4 space-y-2">
          {jobsPosted.length ? (
            jobsPosted.map((job) => (
              <Card key={job._id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{job.category} · ₹{job.payAmount}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No jobs posted.</p>
          )}
        </TabsContent>

        <TabsContent value="worked" className="mt-4 space-y-2">
          {jobsWorked.length ? (
            jobsWorked.map((job) => (
              <Card key={job._id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{job.category} · ₹{job.payAmount}</p>
                  </div>
                  <StatusBadge status={job.status} />
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No jobs worked.</p>
          )}
        </TabsContent>

        <TabsContent value="ratings" className="mt-4 space-y-2">
          {ratingsReceived.length ? (
            ratingsReceived.map((rating) => (
              <Card key={rating._id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{rating.ratedBy?.name || 'Anonymous'}</p>
                    <p className="text-sm font-semibold">{rating.score} ★</p>
                  </div>
                  {rating.comment && <p className="mt-1 text-sm text-muted-foreground">{rating.comment}</p>}
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No ratings yet.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
