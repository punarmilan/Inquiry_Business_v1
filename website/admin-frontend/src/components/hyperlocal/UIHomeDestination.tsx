import { useId } from 'react';
import { Input } from '@/components/ui/input';
import type { UIHomeCard } from '../../../../../mobile/frontend/src/types/dynamicUI';
import { validHomeLink } from '../../../../../mobile/frontend/src/utils/uiHomeHeader';

export function UIHomeDestination({ card, patch }: { card: UIHomeCard; patch: (values: Record<string, unknown>) => void }) {
  const helpId = useId();
  const external = card.props.homeAction === 'link';
  const valid = validHomeLink(card.props.linkUrl);
  return <div className="space-y-2">
    <label className="block space-y-1 text-sm">When tapped<select className="h-10 w-full rounded-lg border bg-background px-3" value={card.props.homeAction || 'offers'} onChange={e => patch({ homeAction: e.target.value, linkUrl: e.target.value === 'link' ? card.props.linkUrl || '' : undefined })}>
      <option value="offers">Open offers</option><option value="post">Create post</option><option value="services">Find services</option><option value="events">Local events</option><option value="link">Open link</option>
    </select></label>
    {external && <><label className="block space-y-1 text-sm">Link URL<Input type="url" maxLength={2048} placeholder="https://www.youtube.com/watch?v=..." aria-invalid={!valid} aria-describedby={helpId} value={card.props.linkUrl || ''} onChange={e => patch({ linkUrl: e.target.value })} /></label>
      <p id={helpId} className={valid ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>{valid ? 'The whole card opens this link in the supported app or browser.' : 'Enter a full http:// or https:// URL without spaces or sign-in credentials.'}</p>
      {valid && <a className="inline-flex rounded text-xs font-semibold text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={card.props.linkUrl} target="_blank" rel="noopener noreferrer">Test link (new tab)</a>}
    </>}
  </div>;
}
