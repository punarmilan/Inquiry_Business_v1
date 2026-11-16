import { useEffect, useRef, useState } from 'react';
import type { AnimationItem } from 'lottie-web';
import { Button } from '@/components/ui/button';
import { getUIAsset } from '@/api/ui';
import { parseUIAnimation } from '../../../../../mobile/frontend/src/utils/uiAnimation';

export function UIAnimationPreview({ assetId, speed = 1, loop = false, loopCount = 1, height = 160, controls = true, autoPlay = false, onPlaybackEnd }: { assetId: string; speed?: number; loop?: boolean; loopCount?: number; height?: number; controls?: boolean; autoPlay?: boolean; onPlaybackEnd?: (result: 'finished' | 'failed') => void }) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<AnimationItem | null>(null);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const endCallback = useRef(onPlaybackEnd); endCallback.current = onPlaybackEnd;
  useEffect(() => {
    let cancelled = false;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    setError(''); setPlaying(false);
    const stop = () => { player.current?.pause(); setPlaying(false); };
    const visibility = () => { if (document.hidden) stop(); };
    motion.addEventListener('change', stop); document.addEventListener('visibilitychange', visibility);
    void Promise.all([getUIAsset(assetId), import('lottie-web/build/player/lottie_light')]).then(([asset, module]) => {
      if (cancelled || !host.current) return;
      if (!asset.enabled || asset.archived) throw new Error('Animation is disabled.');
      const animationData = parseUIAnimation(asset.animation);
      const animation = module.default.loadAnimation({ container: host.current, renderer: 'svg', loop: loop ? Math.max(0, Math.min(loopCount, 3) - 1) : false, autoplay: false, animationData });
      player.current = animation; animation.setSpeed(speed);
      animation.addEventListener('data_failed', () => { setError('Animation preview failed.'); endCallback.current?.('failed'); animation.destroy(); });
      animation.addEventListener('complete', () => { setPlaying(false); endCallback.current?.('finished'); });
      animation.addEventListener('DOMLoaded', () => { if (autoPlay && !motion.matches && !document.hidden) { animation.play(); setPlaying(true); } });
    }).catch(() => { if (!cancelled) { setError('Animation unavailable. A static fallback will appear in the app.'); endCallback.current?.('failed'); } });
    return () => { cancelled = true; player.current?.destroy(); player.current = null; motion.removeEventListener('change', stop); document.removeEventListener('visibilitychange', visibility); };
  }, [assetId, speed, loop, loopCount, autoPlay]);
  return <div className="space-y-2">
    <div ref={host} className="w-full overflow-hidden rounded-md" style={{ height }} aria-label="Animation preview" />
    {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : controls ? <Button size="sm" variant="outline" onClick={() => {
      if (!player.current) return;
      if (playing) player.current.pause(); else { if (player.current.currentFrame >= player.current.totalFrames - 1) player.current.goToAndPlay(0, true); else player.current.play(); }
      setPlaying(!playing);
    }}>{playing ? 'Pause preview' : 'Play preview'}</Button> : null}
  </div>;
}
