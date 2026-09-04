import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  open: 'border border-secondary/20 bg-accent text-accent-foreground hover:bg-accent',
  'in-progress': 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10',
  completed: 'border border-[#2E9E5B]/20 bg-[#E3F6EA] text-[#1D6F3D] hover:bg-[#E3F6EA]',
  cancelled: 'border border-border bg-muted text-muted-foreground hover:bg-muted',
  pending: 'border border-[#F4A51C]/25 bg-[#FFF3CF] text-[#8A5200] hover:bg-[#FFF3CF]',
  paid: 'border border-[#2E9E5B]/20 bg-[#E3F6EA] text-[#1D6F3D] hover:bg-[#E3F6EA]',
  failed: 'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10',
  refunded: 'border border-border bg-muted text-muted-foreground hover:bg-muted',
  approved: 'border border-[#2E9E5B]/20 bg-[#E3F6EA] text-[#1D6F3D] hover:bg-[#E3F6EA]',
  rejected: 'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10',
  active: 'border border-[#2E9E5B]/20 bg-[#E3F6EA] text-[#1D6F3D] hover:bg-[#E3F6EA]',
  blocked: 'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10',
  submitted: 'border border-[#F4A51C]/25 bg-[#FFF3CF] text-[#8A5200] hover:bg-[#FFF3CF]',
  verified: 'border border-[#2E9E5B]/20 bg-[#E3F6EA] text-[#1D6F3D] hover:bg-[#E3F6EA]',
  not_started: 'border border-border bg-muted text-muted-foreground hover:bg-muted',
  // Hyperlocal offers/services vocabulary
  pending_review: 'border border-[#F4A51C]/25 bg-[#FFF3CF] text-[#8A5200] hover:bg-[#FFF3CF]',
  pending_verification: 'border border-[#F4A51C]/25 bg-[#FFF3CF] text-[#8A5200] hover:bg-[#FFF3CF]',
  live: 'border border-[#2E9E5B]/20 bg-[#E3F6EA] text-[#1D6F3D] hover:bg-[#E3F6EA]',
  expired: 'border border-border bg-muted text-muted-foreground hover:bg-muted',
  suspended: 'border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/10',
  featured: 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10',
  requested: 'border border-[#F4A51C]/25 bg-[#FFF3CF] text-[#8A5200] hover:bg-[#FFF3CF]',
  confirmed: 'border border-secondary/20 bg-accent text-accent-foreground hover:bg-accent',
  assigned: 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10',
  in_progress: 'border border-primary/20 bg-primary/10 text-primary hover:bg-primary/10',
};

export const StatusBadge = ({ status }: { status: string }) => (
  <Badge variant="secondary" className={cn('font-semibold capitalize shadow-none', STATUS_STYLES[status])}>
    {status}
  </Badge>
);
